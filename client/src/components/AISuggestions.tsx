
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Lightbulb, CheckCircle, X, Sparkles, Code, Zap, Shield, Wrench } from 'lucide-react';

interface AISuggestion {
  id?: number;
  suggestion: string;
  confidence: number;
  suggestedFix: string;
  reasoning: string;
  category: 'refactor' | 'security' | 'performance' | 'bug-fix';
}

interface AISuggestionsProps {
  repository: string;
  filePath: string;
  code: string;
  language?: string;
  issues?: any[];
}

export default function AISuggestions({ repository, filePath, code, language, issues }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  useEffect(() => {
    if (code && filePath) {
      generateSuggestions();
    }
  }, [code, filePath]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository,
          filePath,
          code,
          language,
          issues
        })
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/ai-suggestions/${suggestionId}/apply`, {
        method: 'POST'
      });

      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  const rejectSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/ai-suggestions/${suggestionId}/reject`, {
        method: 'POST'
      });

      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'performance':
        return <Zap className="h-4 w-4" />;
      case 'refactor':
        return <Wrench className="h-4 w-4" />;
      case 'bug-fix':
        return <Code className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'bg-red-100 text-red-700';
      case 'performance':
        return 'bg-blue-100 text-blue-700';
      case 'refactor':
        return 'bg-purple-100 text-purple-700';
      case 'bug-fix':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Suggestions
          </CardTitle>
          <CardDescription>Generating intelligent code improvements...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Suggestions
          {suggestions.length > 0 && (
            <Badge variant="secondary">{suggestions.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          AI-powered code improvements for {filePath}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No suggestions available for this file</p>
            <p className="text-sm">The code looks good or needs more context for analysis</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getCategoryColor(suggestion.category)}`}>
                      {getCategoryIcon(suggestion.category)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{suggestion.suggestion}</h4>
                      <p className="text-xs text-gray-600 mt-1">{suggestion.reasoning}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`text-xs ${getCategoryColor(suggestion.category)}`}>
                          {suggestion.category}
                        </Badge>
                        <Badge className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedSuggestion(
                        expandedSuggestion === index ? null : index
                      )}
                    >
                      {expandedSuggestion === index ? 'Hide' : 'View Fix'}
                    </Button>
                    {suggestion.id && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => applySuggestion(suggestion.id!)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectSuggestion(suggestion.id!)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {expandedSuggestion === index && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Suggested Fix:</h5>
                    <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                      <code>{suggestion.suggestedFix}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
