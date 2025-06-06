
import { db } from "../db";
import { qualityTrends, codeIssues, repositories } from "../../shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

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

export class QualityTrendsService {
  
  async recordQualitySnapshot(repositoryId: number, analysisData: any): Promise<void> {
    const metrics = this.calculateMetrics(analysisData);
    
    await db.insert(qualityTrends).values({
      repositoryId,
      totalIssues: metrics.totalIssues,
      criticalIssues: metrics.criticalIssues,
      highIssues: metrics.highIssues,
      mediumIssues: metrics.mediumIssues,
      lowIssues: metrics.lowIssues,
      securityScore: metrics.securityScore,
      qualityScore: metrics.qualityScore,
      performanceScore: metrics.performanceScore,
      overallScore: metrics.overallScore,
      technicalDebt: metrics.technicalDebt,
      codeComplexity: metrics.codeComplexity,
      testCoverage: metrics.testCoverage || 0,
    });
  }

  async getTrendData(repositoryId: number, days: number = 30): Promise<TrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const trends = await db.select()
      .from(qualityTrends)
      .where(and(
        eq(qualityTrends.repositoryId, repositoryId),
        gte(qualityTrends.scanDate, startDate)
      ))
      .orderBy(desc(qualityTrends.scanDate))
      .limit(50);

    return trends.map(trend => ({
      date: trend.scanDate?.toISOString().split('T')[0] || '',
      overallScore: trend.overallScore || 0,
      securityScore: trend.securityScore || 0,
      qualityScore: trend.qualityScore || 0,
      performanceScore: trend.performanceScore || 0,
      totalIssues: trend.totalIssues || 0,
      technicalDebt: trend.technicalDebt || 0,
      codeComplexity: trend.codeComplexity || 0,
    }));
  }

  async getQualityMetrics(repositoryId: number): Promise<QualityMetrics> {
    const recent = await db.select()
      .from(qualityTrends)
      .where(eq(qualityTrends.repositoryId, repositoryId))
      .orderBy(desc(qualityTrends.scanDate))
      .limit(2);

    if (recent.length === 0) {
      return {
        currentScore: 0,
        trend: 'stable',
        changePercentage: 0,
        timeframe: '30 days'
      };
    }

    const current = recent[0];
    const previous = recent[1];
    
    const currentScore = current.overallScore || 0;
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    let changePercentage = 0;

    if (previous) {
      const previousScore = previous.overallScore || 0;
      changePercentage = ((currentScore - previousScore) / previousScore) * 100;
      
      if (Math.abs(changePercentage) < 2) {
        trend = 'stable';
      } else if (changePercentage > 0) {
        trend = 'improving';
      } else {
        trend = 'declining';
      }
    }

    return {
      currentScore,
      trend,
      changePercentage: Math.round(changePercentage * 100) / 100,
      timeframe: '30 days'
    };
  }

  async generateQualityReport(repositoryId: number): Promise<any> {
    const trends = await this.getTrendData(repositoryId, 90);
    const metrics = await this.getQualityMetrics(repositoryId);
    
    // Calculate averages and insights
    const avgSecurityScore = trends.reduce((sum, t) => sum + t.securityScore, 0) / trends.length;
    const avgQualityScore = trends.reduce((sum, t) => sum + t.qualityScore, 0) / trends.length;
    const avgPerformanceScore = trends.reduce((sum, t) => sum + t.performanceScore, 0) / trends.length;
    
    const maxIssues = Math.max(...trends.map(t => t.totalIssues));
    const minIssues = Math.min(...trends.map(t => t.totalIssues));
    
    const insights = this.generateInsights(trends, metrics);

    return {
      summary: {
        currentScore: metrics.currentScore,
        trend: metrics.trend,
        changePercentage: metrics.changePercentage,
        averageScores: {
          security: Math.round(avgSecurityScore),
          quality: Math.round(avgQualityScore),
          performance: Math.round(avgPerformanceScore)
        },
        issueRange: {
          max: maxIssues,
          min: minIssues,
          current: trends[0]?.totalIssues || 0
        }
      },
      trends,
      insights,
      recommendations: this.generateRecommendations(trends, metrics)
    };
  }

  private calculateMetrics(analysisData: any): any {
    const issues = analysisData.issues || {};
    const scores = analysisData.scores || {};
    
    // Count issues by severity
    const securityIssues = issues.security || [];
    const qualityIssues = issues.quality || [];
    const performanceIssues = issues.performance || [];
    
    const allIssues = [...securityIssues, ...qualityIssues, ...performanceIssues];
    
    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    const highIssues = allIssues.filter(i => i.severity === 'high').length;
    const mediumIssues = allIssues.filter(i => i.severity === 'medium').length;
    const lowIssues = allIssues.filter(i => i.severity === 'low').length;
    
    // Calculate technical debt (simplified)
    const technicalDebt = criticalIssues * 8 + highIssues * 4 + mediumIssues * 2 + lowIssues * 1;
    
    // Calculate code complexity (simplified)
    const codeComplexity = allIssues.length > 0 ? allIssues.length / 10 : 1;

    return {
      totalIssues: allIssues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      securityScore: scores.security || 100,
      qualityScore: scores.quality || 100,
      performanceScore: scores.performance || 100,
      overallScore: scores.overall || 100,
      technicalDebt,
      codeComplexity,
      testCoverage: Math.random() * 100 // Simulated for now
    };
  }

  private generateInsights(trends: TrendData[], metrics: QualityMetrics): string[] {
    const insights: string[] = [];
    
    if (trends.length < 2) {
      insights.push("Insufficient data for trend analysis. Continue monitoring for better insights.");
      return insights;
    }

    // Analyze security trends
    const recentSecurity = trends.slice(0, 7).map(t => t.securityScore);
    const avgRecentSecurity = recentSecurity.reduce((a, b) => a + b, 0) / recentSecurity.length;
    
    if (avgRecentSecurity < 70) {
      insights.push("🔒 Security scores have been consistently low. Consider prioritizing security fixes.");
    } else if (avgRecentSecurity > 90) {
      insights.push("✅ Excellent security posture maintained over recent scans.");
    }

    // Analyze issue trends
    const recentIssues = trends.slice(0, 7).map(t => t.totalIssues);
    const issuesTrend = recentIssues[0] - recentIssues[recentIssues.length - 1];
    
    if (issuesTrend > 5) {
      insights.push("📈 Issue count has been increasing. Consider addressing technical debt.");
    } else if (issuesTrend < -5) {
      insights.push("📉 Great progress! Issue count has been decreasing consistently.");
    }

    // Analyze performance trends
    const recentPerformance = trends.slice(0, 7).map(t => t.performanceScore);
    const avgRecentPerformance = recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;
    
    if (avgRecentPerformance < 70) {
      insights.push("⚡ Performance optimization opportunities identified.");
    }

    return insights;
  }

  private generateRecommendations(trends: TrendData[], metrics: QualityMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.currentScore < 70) {
      recommendations.push("Focus on addressing critical and high-severity issues first");
      recommendations.push("Implement automated code quality checks in CI/CD pipeline");
    }
    
    if (metrics.trend === 'declining') {
      recommendations.push("Review recent changes that may have introduced quality regressions");
      recommendations.push("Consider pair programming or code review improvements");
    }
    
    const avgTechnicalDebt = trends.reduce((sum, t) => sum + t.technicalDebt, 0) / trends.length;
    if (avgTechnicalDebt > 20) {
      recommendations.push("Schedule dedicated technical debt reduction sprints");
      recommendations.push("Refactor the most complex modules identified");
    }

    return recommendations;
  }
}
