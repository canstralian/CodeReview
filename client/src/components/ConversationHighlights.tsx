import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Brain, Code, Cog, Shield, BarChart } from 'lucide-react';

interface Highlight {
  id: string;
  emoji: string;
  title: string;
  date: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const highlights: Highlight[] = [
  {
    id: 'mind-mirror',
    emoji: '🧠',
    title: 'The Mind Mirror',
    date: 'Oct 10',
    description: 'A fascinating cognitive pattern analysis framework - a tool designed to help users understand how they think, not just what they think.',
    features: [
      'Maps cognitive patterns, biases, and mental habits',
      'Turns self-awareness into practical strategy',
      'Provides actionable insights for better decision-making'
    ],
    icon: Brain
  },
  {
    id: 'codetune-studio',
    emoji: '🔧',
    title: 'CodeTuneStudio Pro',
    date: 'Oct 9-10',
    description: 'Built multiple versions of a full-stack AI-powered code optimization platform featuring:',
    features: [
      'React frontend with split-pane code editor',
      'FastAPI backend with JWT auth and rate limiting',
      'PostgreSQL for analytics and user management',
      'AI integration for bug detection, refactoring, and security checks',
      'Tiered subscription model with usage-based billing'
    ],
    icon: Code
  },
  {
    id: 'mcp-automation',
    emoji: '🤖',
    title: 'MCP Server Automation',
    date: 'Oct 10',
    description: 'Designed a complex workflow automation system integrating multiple services for automated feature development and user research pipelines.',
    features: [
      'JIRA and GitHub integration',
      'Sentry error tracking',
      'Statsig feature flags',
      'Postgres data management',
      'Figma, Slack, and Gmail automation'
    ],
    icon: Cog
  },
  {
    id: 'security-projects',
    emoji: '🔍',
    title: 'Security Projects',
    date: 'Oct 6-8',
    description: 'Comprehensive security analysis and vulnerability detection systems:',
    features: [
      'FastAPI Security Service with real-time code analysis',
      'AITradePro Security Audit with compliance mapping (OWASP, NIST, CWE)',
      'Security reviews for Streamlit Session Manager and Patchai library'
    ],
    icon: Shield
  },
  {
    id: 'content-automation',
    emoji: '📊',
    title: 'Content Automation Framework',
    date: 'Oct 8',
    description: 'Designed an extensive metrics and evaluation system for automated content generation.',
    features: [
      'SEO performance tracking',
      'Engagement analysis',
      'ROI calculations',
      'Automated content quality scoring'
    ],
    icon: BarChart
  }
];

const ConversationHighlights: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto mt-8 mb-12 px-4">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-3">
          Recent Conversation Highlights
        </h2>
        <p className="text-gray-600">
          Explore recent projects across security automation, AI/ML integration, and full-stack development
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {highlights.map((highlight) => {
          const IconComponent = highlight.icon;
          return (
            <Card key={highlight.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{highlight.emoji}</span>
                    <IconComponent className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{highlight.date}</span>
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {highlight.title}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 mt-2">
                  {highlight.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {highlight.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-gray-600 italic">
          Would you like to dive deeper into any of these projects?
        </p>
      </div>
    </div>
  );
};

export default ConversationHighlights;
