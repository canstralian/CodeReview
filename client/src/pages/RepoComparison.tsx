import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { scanAllRepositories } from "../lib/github";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import type { RepositoryComparisonResponse, RepositoryOverlap } from "../types";

export default function RepoComparison() {
  const [username, setUsername] = useState("");
  const [comparisonData, setComparisonData] = useState<RepositoryComparisonResponse | null>(null);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  const scanReposMutation = useMutation({
    mutationFn: scanAllRepositories,
    onSuccess: (data) => {
      setComparisonData(data);
      setHasError(false);
    },
    onError: (error) => {
      setHasError(true);
      toast({
        title: "Error scanning repositories",
        description: error instanceof Error ? error.message : "Please check the username and try again.",
        variant: "destructive",
      });
    },
  });

  const handleScanRepositories = () => {
    if (!username.trim()) {
      toast({
        title: "Empty username",
        description: "Please enter a GitHub username.",
        variant: "destructive",
      });
      return;
    }

    scanReposMutation.mutate(username);
  };

  const renderOverlap = (overlap: RepositoryOverlap, index: number) => {
    return (
      <Card key={index} className="mb-6">
        <CardHeader>
          <CardTitle className="flex flex-row justify-between items-center">
            <div>Repository Overlap</div>
            <Badge variant="outline" className="ml-2">
              {overlap.similarFiles.length} Similar Files
            </Badge>
          </CardTitle>
          <CardDescription>
            Between <strong>{overlap.repositories[0].name}</strong> and <strong>{overlap.repositories[1].name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm mb-4">{overlap.description}</div>
          
          <div className="font-semibold mb-2 text-md">Recommendation:</div>
          <div className="text-sm mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            {overlap.mergeRecommendation}
          </div>
          
          <div className="font-semibold mb-2 text-md">Similar Files:</div>
          <div className="max-h-60 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">{overlap.repositories[0].name}</th>
                  <th className="px-4 py-2 text-left">{overlap.repositories[1].name}</th>
                  <th className="px-4 py-2 text-right">Similarity</th>
                </tr>
              </thead>
              <tbody>
                {overlap.similarFiles.map((file, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{file.file1.filePath}</td>
                    <td className="px-4 py-2">{file.file2.filePath}</td>
                    <td className="px-4 py-2 text-right">
                      <Badge variant={file.similarityScore > 0.8 ? "default" : file.similarityScore > 0.6 ? "outline" : "secondary"}>
                        {Math.round(file.similarityScore * 100)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderProjectOverview = () => {
    if (!comparisonData || !comparisonData.projectOverview) return null;
    
    const { projectOverview } = comparisonData;
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>Overall statistics across all repositories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-lg font-semibold">Summary</div>
              <ul className="mt-2 space-y-2">
                <li className="flex justify-between">
                  <span>Total Repositories:</span>
                  <Badge variant="outline">{projectOverview.totalRepositories}</Badge>
                </li>
                <li className="flex justify-between">
                  <span>Total Files:</span>
                  <Badge variant="outline">{projectOverview.totalFiles}</Badge>
                </li>
                <li className="flex justify-between">
                  <span>Duplicate Code:</span>
                  <Badge variant="outline">{projectOverview.duplicateCodePercentage.toFixed(1)}%</Badge>
                </li>
              </ul>
            </div>
            
            <div>
              <div className="text-lg font-semibold">Language Distribution</div>
              <ul className="mt-2 space-y-2">
                {Object.entries(projectOverview.languageDistribution)
                  .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                  .map(([language, count], idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{language}:</span>
                      <Badge variant="outline">{count as number} files</Badge>
                    </li>
                  ))
                }
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="bg-white text-[#202124] min-h-screen">
      <div className="container mx-auto px-4 flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow flex flex-col items-center justify-start py-8">
          <div className="w-full max-w-4xl">
            <h1 className="text-3xl font-bold text-center mb-6">Repository Scanner</h1>
            <p className="text-center text-gray-600 mb-8">
              Scan all repositories for a GitHub user to identify redundancies and optimization opportunities
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-grow">
                <Input 
                  type="text" 
                  placeholder="Enter GitHub username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button 
                onClick={handleScanRepositories}
                disabled={scanReposMutation.isPending}
                className="bg-[#4285F4] hover:bg-blue-600"
              >
                Scan Repositories
              </Button>
            </div>
            
            {scanReposMutation.isPending && <LoadingState />}
            
            {!scanReposMutation.isPending && !comparisonData && <EmptyState hasError={hasError} />}
            
            {!scanReposMutation.isPending && comparisonData && (
              <div>
                {renderProjectOverview()}
                
                <h2 className="text-xl font-semibold mt-8 mb-4">Repository Overlaps</h2>
                
                {comparisonData.overlaps.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No significant overlaps found between repositories</p>
                  </div>
                ) : (
                  comparisonData.overlaps.map((overlap, index) => renderOverlap(overlap, index))
                )}
              </div>
            )}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}