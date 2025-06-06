
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface TrendData {
  date: string;
  overallScore: number;
  securityScore: number;
  qualityScore: number;
  performanceScore: number;
  totalIssues: number;
  technicalDebt: number;
  codeComplexity: number;
}

interface QualityMetrics {
  currentScore: number;
  trend: 'improving' | 'declining' | 'stable';
  changePercentage: number;
  timeframe: string;
}

interface QualityTrendsProps {
  repository: string;
}

export default function QualityTrends({ repository }: QualityTrendsProps) {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30');

  useEffect(() => {
    fetchQualityTrends();
  }, [repository, timeframe]);

  const fetchQualityTrends = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quality-trends/${repository}?days=${timeframe}`);
      const data = await response.json();
      
      setTrends(data.trends || []);
      setMetrics(data.metrics);
      setInsights(data.report?.insights || []);
      setRecommendations(data.report?.recommendations || []);
    } catch (error) {
      console.error('Error fetching quality trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50';
      case 'declining':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quality Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            {getTrendIcon(metrics?.trend || 'stable')}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(metrics?.currentScore || 0)}`}>
              {metrics?.currentScore || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.changePercentage !== undefined && (
                <span className={getTrendColor(metrics.trend)}>
                  {metrics.changePercentage > 0 ? '+' : ''}{metrics.changePercentage.toFixed(1)}%
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(trends[0]?.securityScore || 0)}`}>
              {trends[0]?.securityScore || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Security posture
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trends[0]?.totalIssues || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Technical Debt</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(trends[0]?.technicalDebt || 0)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Trends</CardTitle>
          <CardDescription>
            Code quality metrics over the last {timeframe} days
          </CardDescription>
          <div className="flex gap-2">
            {['7', '30', '90'].map((days) => (
              <button
                key={days}
                onClick={() => setTimeframe(days)}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeframe === days
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {trends.length > 0 ? (
              <div className="space-y-4">
                {/* Simple trend visualization */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Security</div>
                    <div className={`text-lg font-bold ${getScoreColor(trends[0]?.securityScore || 0)}`}>
                      {trends[0]?.securityScore || 0}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Quality</div>
                    <div className={`text-lg font-bold ${getScoreColor(trends[0]?.qualityScore || 0)}`}>
                      {trends[0]?.qualityScore || 0}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Performance</div>
                    <div className={`text-lg font-bold ${getScoreColor(trends[0]?.performanceScore || 0)}`}>
                      {trends[0]?.performanceScore || 0}
                    </div>
                  </div>
                </div>
                
                {/* Recent trend indicators */}
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600 mb-2">Recent Changes:</div>
                  <div className="flex flex-wrap gap-2">
                    {trends.slice(0, 5).map((trend, index) => (
                      <div key={index} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded">
                        <span>{trend.date}</span>
                        <span className={getScoreColor(trend.overallScore)}>
                          {trend.overallScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No trend data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>AI-generated insights from your code quality trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.length > 0 ? (
                insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">{insight}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No insights available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Actionable steps to improve your code quality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                    <Target className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700">{recommendation}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recommendations available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
