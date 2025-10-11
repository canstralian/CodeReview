import { useState } from "react";
import { Card } from "./ui/card";
import { Loader2, Sparkles, Send, History, X } from "lucide-react";

interface AgentMessage {
  id: string;
  type: "user" | "agent";
  action?: string;
  content: string;
  timestamp: Date;
  data?: any;
}

interface ReplitAgentProps {
  code?: string;
  filePath?: string;
  language?: string;
  repositoryId?: number;
}

export default function ReplitAgent({ code, filePath, language, repositoryId }: ReplitAgentProps) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedAction, setSelectedAction] = useState<"analyze" | "query" | "refactor" | "security_scan">("analyze");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Create a new session
  const createSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repositoryId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json();
      setSessionToken(data.sessionToken);
      setIsSessionActive(true);

      setMessages([
        {
          id: Date.now().toString(),
          type: "agent",
          content: "👋 Hello! I'm your Replit AI Agent. I can help you analyze code, answer questions, suggest refactorings, and perform security scans. What would you like to do?",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  // Send a request to the agent
  const sendRequest = async () => {
    if (!sessionToken || !inputValue.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      type: "user",
      action: selectedAction,
      content: selectedAction === "query" ? inputValue : `${selectedAction}: ${filePath || "code snippet"}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const requestBody: any = {
        sessionToken,
        action: selectedAction,
      };

      // Add appropriate fields based on action
      if (selectedAction === "query") {
        requestBody.query = inputValue;
        if (code) requestBody.code = code;
      } else {
        requestBody.code = code || inputValue;
        if (filePath) requestBody.filePath = filePath;
        if (language) requestBody.language = language;
      }

      const response = await fetch("/api/agent/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process request");
      }

      const data = await response.json();

      // Format agent response based on action type
      let responseContent = "";
      const responseData = data.data;

      switch (selectedAction) {
        case "analyze":
          responseContent = formatAnalysisResponse(responseData);
          break;
        case "query":
          responseContent = responseData.explanation || "No explanation provided";
          break;
        case "refactor":
          responseContent = formatRefactoringResponse(responseData);
          break;
        case "security_scan":
          responseContent = formatSecurityResponse(responseData);
          break;
      }

      const agentMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: responseContent,
        timestamp: new Date(),
        data: responseData,
      };

      setMessages((prev) => [...prev, agentMessage]);
      setInputValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process request");
      
      // Add error message
      const errorMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format analysis response
  const formatAnalysisResponse = (data: any) => {
    let response = "📊 **Code Analysis Results**\n\n";

    if (data.analysis) {
      response += `**Quality Score:** ${data.analysis.quality_score || "N/A"}/100\n`;
      response += `**Summary:** ${data.analysis.summary || "No summary"}\n\n`;
    }

    if (data.suggestions && data.suggestions.length > 0) {
      response += "**Suggestions:**\n";
      data.suggestions.forEach((suggestion: any, idx: number) => {
        response += `\n${idx + 1}. **${suggestion.type}** (${suggestion.severity})\n`;
        response += `   Line ${suggestion.line}: ${suggestion.message}\n`;
        response += `   💡 ${suggestion.suggestion}\n`;
      });
    } else {
      response += "✅ No issues found!";
    }

    return response;
  };

  // Format refactoring response
  const formatRefactoringResponse = (data: any) => {
    let response = "♻️ **Refactoring Suggestions**\n\n";

    if (data.refactoringSuggestions && data.refactoringSuggestions.length > 0) {
      data.refactoringSuggestions.forEach((suggestion: any, idx: number) => {
        response += `\n${idx + 1}. **${suggestion.type}**\n`;
        response += `   ${suggestion.description}\n`;
        response += `   📝 Reasoning: ${suggestion.reasoning}\n`;
        if (suggestion.example) {
          response += `   \`\`\`\n${suggestion.example}\n\`\`\`\n`;
        }
      });
    } else {
      response += "✅ Code looks good! No refactoring needed.";
    }

    return response;
  };

  // Format security response
  const formatSecurityResponse = (data: any) => {
    let response = "🔒 **Security Scan Results**\n\n";

    if (data.securityIssues && data.securityIssues.length > 0) {
      response += `**Found ${data.securityIssues.length} security issue(s):**\n`;
      data.securityIssues.forEach((issue: any, idx: number) => {
        response += `\n${idx + 1}. **${issue.type}** (${issue.severity})\n`;
        response += `   Line ${issue.line}: ${issue.description}\n`;
        response += `   🛡️ Remediation: ${issue.remediation}\n`;
      });
    } else {
      response += "✅ No security issues detected!";
    }

    return response;
  };

  // Close session
  const closeSession = async () => {
    if (!sessionToken) return;

    try {
      await fetch(`/api/agent/session/${sessionToken}/close`, {
        method: "POST",
      });

      setSessionToken(null);
      setIsSessionActive(false);
      setMessages([]);
      setInputValue("");
    } catch (err) {
      console.error("Failed to close session:", err);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Replit AI Agent
          </h2>
        </div>
        {isSessionActive && (
          <button
            onClick={closeSession}
            className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            title="Close session"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {!isSessionActive ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Start a session to interact with the AI Agent for deeper code analysis,
            explanations, and recommendations.
          </p>
          <button
            onClick={createSession}
            disabled={isLoading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start AI Session
              </>
            )}
          </button>
        </div>
      ) : (
        <div>
          {/* Messages */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.type === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] p-3 rounded-lg ${
                    message.type === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  }`}
                >
                  {message.action && (
                    <div className="text-xs opacity-75 mb-1">
                      {message.action.toUpperCase()}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                  <div className="text-xs opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin inline-block text-purple-600" />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Action selector */}
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Action:
            </label>
            <div className="flex gap-2">
              {["analyze", "query", "refactor", "security_scan"].map((action) => (
                <button
                  key={action}
                  onClick={() => setSelectedAction(action as any)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedAction === action
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {action.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isLoading && sendRequest()}
              placeholder={
                selectedAction === "query"
                  ? "Ask a question about the code..."
                  : code
                  ? "Analyzing provided code..."
                  : "Paste code to analyze..."
              }
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isLoading}
            />
            <button
              onClick={sendRequest}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
