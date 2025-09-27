import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  GitBranch, 
  Star, 
  GitFork, 
  Eye, 
  AlertTriangle, 
  Plus, 
  X, 
  Github,
  Activity,
  Calendar,
  TrendingUp,
  Users,
  Code,
  Shield,
  RefreshCw
} from 'lucide-react';

interface RepositoryMetrics {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  openPRs: number;
  vulnerabilityAlerts: number;
}

interface RepositoryActivity {
  lastCommit: string | null;
  latestRelease: {
    tagName: string;
    createdAt: string;
  } | null;
}

interface Language {
  name: string;
  color: string;
  percentage: number;
}

interface RepositoryData {
  repository: string;
  name: string;
  owner: string;
  description: string;
  metrics: RepositoryMetrics;
  activity: RepositoryActivity;
  languages: Language[];
  status: 'success' | 'error';
  error?: string;
}

interface DashboardSummary {
  totalRepositories: number;
  successfulFetches: number;
  totalStars: number;
  totalForks: number;
  totalOpenIssues: number;
  totalOpenPRs: number;
  totalVulnerabilities: number;
  avgStarsPerRepo: number;
}

interface TeamDashboardProps {
  className?: string;
}

export default function TeamDashboard({ className = '' }: TeamDashboardProps) {
  const [repositories, setRepositories] = useState<string[]>(['']);
  const [dashboardData, setDashboardData] = useState<{
    summary: DashboardSummary;
    repositories: RepositoryData[];
    generatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRepositoryField = () => {
    setRepositories([...repositories, '']);
  };

  const removeRepositoryField = (index: number) => {
    const newRepos = repositories.filter((_, i) => i !== index);
    setRepositories(newRepos.length > 0 ? newRepos : ['']);
  };

  const updateRepository = (index: number, value: string) => {
    const newRepos = [...repositories];
    newRepos[index] = value;
    setRepositories(newRepos);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Filter out empty repositories
      const validRepos = repositories.filter(repo => repo.trim() !== '');
      
      if (validRepos.length === 0) {
        setError('Please enter at least one repository');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/team-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositories: validRepos
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setDashboardData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getLanguageBar = (languages: Language[]) => {
    return (
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
        {languages.map((lang, index) => (
          <div
            key={index}
            className="h-full"
            style={{
              width: `${lang.percentage}%`,
              backgroundColor: lang.color || '#888'
            }}
            title={`${lang.name}: ${lang.percentage}%`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Dashboard
          </CardTitle>
          <CardDescription>
            Monitor your team's GitHub repositories with real-time metrics and insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Repository Input Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Repositories to Monitor</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRepositoryField}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Repository
              </Button>
            </div>
            
            {repositories.map((repo, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Github className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="owner/repository (e.g., facebook/react)"
                  value={repo}
                  onChange={(e) => updateRepository(index, e.target.value)}
                  className="flex-1"
                />
                {repositories.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRepositoryField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={fetchDashboardData} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {loading ? 'Fetching...' : 'Fetch Dashboard Data'}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Results */}
      {dashboardData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stars</CardTitle>
                <Star className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.summary.totalStars.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {dashboardData.summary.avgStarsPerRepo}/repo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.summary.totalOpenIssues}</div>
                <p className="text-xs text-muted-foreground">
                  Across {dashboardData.summary.successfulFetches} repos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open PRs</CardTitle>
                <GitBranch className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.summary.totalOpenPRs}</div>
                <p className="text-xs text-muted-foreground">Ready for review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
                <Shield className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.summary.totalVulnerabilities}</div>
                <p className="text-xs text-muted-foreground">Security alerts</p>
              </CardContent>
            </Card>
          </div>

          {/* Repository Details */}
          <Card>
            <CardHeader>
              <CardTitle>Repository Details</CardTitle>
              <CardDescription>
                Detailed metrics for each monitored repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.repositories.map((repo, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Github className="h-5 w-5" />
                            {repo.repository}
                            {repo.status === 'error' && (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </h3>
                          {repo.description && (
                            <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
                          )}
                        </div>
                      </div>

                      {repo.status === 'error' ? (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{repo.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <Tabs defaultValue="metrics" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="metrics">Metrics</TabsTrigger>
                            <TabsTrigger value="activity">Activity</TabsTrigger>
                            <TabsTrigger value="languages">Languages</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="metrics" className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm">{repo.metrics.stars} stars</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <GitFork className="h-4 w-4 text-gray-600" />
                                <span className="text-sm">{repo.metrics.forks} forks</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{repo.metrics.watchers} watchers</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-sm">{repo.metrics.openIssues} open issues</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-green-600" />
                                <span className="text-sm">{repo.metrics.openPRs} open PRs</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-orange-600" />
                                <span className="text-sm">{repo.metrics.vulnerabilityAlerts} alerts</span>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="activity" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-green-600" />
                                <span className="text-sm">
                                  Last commit: {formatDate(repo.activity.lastCommit)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-purple-600" />
                                <span className="text-sm">
                                  Latest release: {repo.activity.latestRelease ? 
                                    `${repo.activity.latestRelease.tagName} (${formatDate(repo.activity.latestRelease.createdAt)})` : 
                                    'No releases'
                                  }
                                </span>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="languages" className="space-y-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Code className="h-4 w-4" />
                                <span className="text-sm font-medium">Language Distribution</span>
                              </div>
                              {getLanguageBar(repo.languages)}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {repo.languages.map((lang, langIndex) => (
                                  <Badge 
                                    key={langIndex} 
                                    variant="outline" 
                                    className="text-xs"
                                    style={{
                                      borderColor: lang.color,
                                      color: lang.color
                                    }}
                                  >
                                    {lang.name} {lang.percentage}%
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data timestamp */}
          <p className="text-xs text-gray-500 text-center">
            Last updated: {new Date(dashboardData.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}