import { db } from "../db";
import { agentSessions, agentInteractions, repositories } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import Anthropic from "@anthropic-ai/sdk";

interface AgentRequest {
  code?: string;
  filePath?: string;
  language?: string;
  query?: string;
  action: 'analyze' | 'query' | 'refactor' | 'security_scan';
}

interface AgentResponse {
  analysis?: any;
  suggestions?: any[];
  explanation?: string;
  securityIssues?: any[];
  refactoringSuggestions?: any[];
  confidence?: number;
}

interface SessionContext {
  history: Array<{
    request: AgentRequest;
    response: AgentResponse;
    timestamp: string;
  }>;
  repositoryContext?: any;
  userPreferences?: any;
}

export class ReplitAgentService {
  private anthropic: Anthropic;
  private readonly SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Create a new agent session
   */
  async createSession(userId: string, repositoryId?: number): Promise<string> {
    const sessionToken = nanoid(32);
    const expiresAt = new Date(Date.now() + this.SESSION_TTL);
    const now = new Date();

    await db.insert(agentSessions).values({
      userId,
      sessionToken,
      repositoryId,
      status: "active",
      context: { history: [] } as any,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    return sessionToken;
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string) {
    const sessions = await db
      .select()
      .from(agentSessions)
      .where(
        and(
          eq(agentSessions.sessionToken, sessionToken),
          eq(agentSessions.status, "active")
        )
      )
      .limit(1);

    if (sessions.length === 0) {
      throw new Error("Session not found or expired");
    }

    const session = sessions[0];

    // Check if session is expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await this.expireSession(sessionToken);
      throw new Error("Session expired");
    }

    return session;
  }

  /**
   * Update session context
   */
  async updateSessionContext(sessionId: number, context: SessionContext) {
    await db
      .update(agentSessions)
      .set({
        context: context as any,
        updatedAt: new Date(),
      })
      .where(eq(agentSessions.id, sessionId));
  }

  /**
   * Expire a session
   */
  async expireSession(sessionToken: string) {
    await db
      .update(agentSessions)
      .set({ status: "expired" })
      .where(eq(agentSessions.sessionToken, sessionToken));
  }

  /**
   * Process agent request with context awareness
   */
  async processRequest(
    sessionToken: string,
    request: AgentRequest
  ): Promise<AgentResponse> {
    const session = await this.getSession(sessionToken);
    const context = (session.context as SessionContext) || { history: [] };

    // Record interaction start
    const [interaction] = await db
      .insert(agentInteractions)
      .values({
        sessionId: session.id,
        interactionType: request.action,
        request: request as any,
        response: {} as any,
        status: "processing",
        createdAt: new Date(),
        metadata: {
          startTime: new Date().toISOString(),
        } as any,
      })
      .returning();

    try {
      let response: AgentResponse;

      // Process based on action type
      switch (request.action) {
        case "analyze":
          response = await this.analyzeCode(request, context);
          break;
        case "query":
          response = await this.handleQuery(request, context);
          break;
        case "refactor":
          response = await this.suggestRefactoring(request, context);
          break;
        case "security_scan":
          response = await this.performSecurityScan(request, context);
          break;
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      // Update interaction with response
      await db
        .update(agentInteractions)
        .set({
          response: response as any,
          status: "completed",
          metadata: {
            startTime: interaction.metadata?.startTime,
            endTime: new Date().toISOString(),
          } as any,
        })
        .where(eq(agentInteractions.id, interaction.id));

      // Update session context with history
      context.history.push({
        request,
        response,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 10 interactions in context
      if (context.history.length > 10) {
        context.history = context.history.slice(-10);
      }

      await this.updateSessionContext(session.id, context);

      return response;
    } catch (error) {
      // Update interaction as failed
      await db
        .update(agentInteractions)
        .set({
          status: "failed",
          metadata: {
            startTime: interaction.metadata?.startTime,
            endTime: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          } as any,
        })
        .where(eq(agentInteractions.id, interaction.id));

      throw error;
    }
  }

  /**
   * Analyze code using AI
   */
  private async analyzeCode(
    request: AgentRequest,
    context: SessionContext
  ): Promise<AgentResponse> {
    const { code, language = "javascript", filePath } = request;

    if (!code) {
      throw new Error("Code is required for analysis");
    }

    // Build context-aware prompt
    const contextPrompt = this.buildContextPrompt(context);

    const prompt = `${contextPrompt}

Analyze the following ${language} code${filePath ? ` from file ${filePath}` : ''}:

\`\`\`${language}
${code}
\`\`\`

Provide a detailed analysis including:
1. Code quality assessment
2. Potential bugs or issues
3. Performance considerations
4. Security vulnerabilities
5. Best practice recommendations

Format your response as JSON with the following structure:
{
  "analysis": {
    "quality_score": <0-100>,
    "summary": "<brief summary>"
  },
  "suggestions": [
    {
      "type": "<bug|security|performance|style>",
      "severity": "<low|medium|high|critical>",
      "line": <line_number>,
      "message": "<description>",
      "suggestion": "<how to fix>"
    }
  ]
}`;

    const message = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === "text" 
      ? message.content[0].text 
      : "";

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let analysis;
    if (jsonMatch) {
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Optionally log the error for debugging
        console.error("Failed to parse AI JSON response:", e, "Response:", jsonMatch[0]);
        analysis = { analysis: {}, suggestions: [] };
      }
    } else {
      analysis = { analysis: {}, suggestions: [] };
    }

    return {
      analysis: analysis.analysis,
      suggestions: analysis.suggestions,
      confidence: 0.85,
    };
  }

  /**
   * Handle user queries about code
   */
  private async handleQuery(
    request: AgentRequest,
    context: SessionContext
  ): Promise<AgentResponse> {
    const { query, code, language } = request;

    if (!query) {
      throw new Error("Query is required");
    }

    const contextPrompt = this.buildContextPrompt(context);

    const prompt = `${contextPrompt}

User query: ${query}

${code ? `
Related code (${language || "unknown"}):
\`\`\`
${code}
\`\`\`
` : ''}

Provide a detailed, helpful explanation addressing the user's query.`;

    const message = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const explanation = message.content[0].type === "text" 
      ? message.content[0].text 
      : "";

    return {
      explanation,
      confidence: 0.9,
    };
  }

  /**
   * Suggest code refactoring
   */
  private async suggestRefactoring(
    request: AgentRequest,
    context: SessionContext
  ): Promise<AgentResponse> {
    const { code, language = "javascript" } = request;

    if (!code) {
      throw new Error("Code is required for refactoring suggestions");
    }

    const contextPrompt = this.buildContextPrompt(context);

    const prompt = `${contextPrompt}

Analyze this ${language} code and suggest refactoring improvements:

\`\`\`${language}
${code}
\`\`\`

Provide specific refactoring suggestions with:
1. What to change
2. Why it should be changed
3. Example of improved code

Format as JSON:
{
  "refactoringSuggestions": [
    {
      "type": "<extract_method|rename|simplify|etc>",
      "description": "<what to change>",
      "reasoning": "<why>",
      "example": "<improved code>"
    }
  ]
}`;

    const message = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3072,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === "text" 
      ? message.content[0].text 
      : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let result;
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Optionally log the error for debugging
        console.error("Failed to parse refactoring suggestions JSON:", e);
        result = { refactoringSuggestions: [] };
      }
    } else {
      result = { refactoringSuggestions: [] };
    }

    return {
      refactoringSuggestions: result.refactoringSuggestions,
      confidence: 0.8,
    };
  }

  /**
   * Perform security scan
   */
  private async performSecurityScan(
    request: AgentRequest,
    context: SessionContext
  ): Promise<AgentResponse> {
    const { code, language = "javascript" } = request;

    if (!code) {
      throw new Error("Code is required for security scan");
    }

    const contextPrompt = this.buildContextPrompt(context);

    const prompt = `${contextPrompt}

Perform a security analysis on this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Identify security vulnerabilities including:
- SQL injection risks
- XSS vulnerabilities
- Authentication/authorization issues
- Sensitive data exposure
- Insecure dependencies
- Other security concerns

Format as JSON:
{
  "securityIssues": [
    {
      "type": "<vulnerability_type>",
      "severity": "<low|medium|high|critical>",
      "line": <line_number>,
      "description": "<issue description>",
      "remediation": "<how to fix>"
    }
  ]
}`;

    const message = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3072,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === "text" 
      ? message.content[0].text 
      : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { securityIssues: [] };

    return {
      securityIssues: result.securityIssues,
      confidence: 0.85,
    };
  }

  /**
   * Build context prompt from session history
   */
  private buildContextPrompt(context: SessionContext): string {
    if (!context.history || context.history.length === 0) {
      return "You are a helpful code analysis assistant.";
    }

    const recentHistory = context.history.slice(-3);
    const historyText = recentHistory
      .map((item, idx) => {
        return `Previous interaction ${idx + 1}:
- Action: ${item.request.action}
- Summary: ${JSON.stringify(item.response).substring(0, 200)}...`;
      })
      .join("\n\n");

    return `You are a helpful code analysis assistant with context from previous interactions:

${historyText}

Use this context to provide more relevant and consistent responses.`;
  }

  /**
   * Get session history
   */
  async getSessionHistory(sessionToken: string) {
    const session = await this.getSession(sessionToken);

    const interactions = await db
      .select()
      .from(agentInteractions)
      .where(eq(agentInteractions.sessionId, session.id))
      .orderBy(agentInteractions.createdAt);

    return {
      session,
      interactions,
    };
  }

  /**
   * Close a session
   */
  async closeSession(sessionToken: string) {
    await db
      .update(agentSessions)
      .set({ status: "completed" })
      .where(eq(agentSessions.sessionToken, sessionToken));
  }
}
