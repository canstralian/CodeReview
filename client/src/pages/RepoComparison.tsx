import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { scanAllRepositories } from "../lib/github";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import LoadingStateScanner from "../components/LoadingStateScanner";
import EmptyStateComparison from "../components/EmptyStateComparison";
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
      <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-[#4285F4]">Repository Overlap</h3>
          <Badge variant="outline" className="bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC] px-2 py-1 rounded">
            {overlap.similarFiles.length} Similar Files
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          Between <span className="font-semibold">{overlap.repositories[0].name}</span> and <span className="font-semibold">{overlap.repositories[1].name}</span>
        </div>
        
        <div className="text-sm mb-4 text-gray-700">{overlap.description}</div>
        
        <div className="mb-4">
          <div className="font-medium mb-2 text-md text-gray-800">Recommendation</div>
          <div className="text-sm p-4 bg-[#FEF7E0] text-[#C5221F] border-l-4 border-[#FBBC05] rounded">
            {overlap.mergeRecommendation}
          </div>
        </div>
        
        <div className="mb-2">
          <div className="font-medium mb-2 text-md text-gray-800">Similar Files</div>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">{overlap.repositories[0].name}</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">{overlap.repositories[1].name}</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Similarity</th>
                </tr>
              </thead>
              <tbody>
                {overlap.similarFiles.map((file, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"}>
                    <td className="px-4 py-2 text-gray-700">{file.file1.filePath}</td>
                    <td className="px-4 py-2 text-gray-700">{file.file2.filePath}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        file.similarityScore > 0.8 
                          ? "bg-[#E6F4EA] text-[#137333]" 
                          : file.similarityScore > 0.6 
                            ? "bg-[#FEF7E0] text-[#EA8600]" 
                            : "bg-[#FCE8E6] text-[#C5221F]"
                      }`}>
                        {Math.round(file.similarityScore * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectOverview = () => {
    if (!comparisonData || !comparisonData.projectOverview) return null;
    
    const { projectOverview } = comparisonData;
    
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4 text-[#4285F4]">Project Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-4xl font-bold text-[#4285F4] mb-1">{projectOverview.totalRepositories}</div>
            <div className="text-sm text-gray-500">Repositories</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-4xl font-bold text-[#EA4335] mb-1">{projectOverview.totalFiles}</div>
            <div className="text-sm text-gray-500">Total Files</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-4xl font-bold text-[#FBBC05] mb-1">{(projectOverview.duplicateCodePercentage * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Duplicate Code</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">Language Distribution</h3>
          <div className="space-y-3">
            {Object.entries(projectOverview.languageDistribution)
              .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
              .slice(0, 5)
              .map(([language, count], idx) => (
                <div key={idx} className="flex items-center">
                  <span className="text-sm w-24 font-medium text-gray-700">{language || 'Other'}</span>
                  <div className="flex-grow bg-gray-100 h-3 rounded-full">
                    <div 
                      className="bg-[#34A853] h-3 rounded-full" 
                      style={{ width: `${((count as number) / projectOverview.totalFiles) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-700 ml-3 w-12 text-right">{count as number}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white text-[#202124] min-h-screen">
      <div className="container mx-auto px-4 flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow flex flex-col items-center justify-start">
          <div className="w-full max-w-2xl px-4">
            <form className="mb-8" onSubmit={(e) => { e.preventDefault(); handleScanRepositories(); }}>
              <div className="relative">
                <div className="flex items-center bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg focus-within:shadow-lg transition-shadow duration-200">
                  <div className="pl-4 text-gray-400">
                    <i className="fas fa-search"></i>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter GitHub username to scan all repositories"
                    className="w-full py-3 px-4 outline-none rounded-full text-base"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-label="GitHub username"
                    disabled={scanReposMutation.isPending}
                  />
                  {username && (
                    <div className="pr-4 text-gray-400">
                      <i className="fas fa-times cursor-pointer" onClick={() => setUsername("")}></i>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-center mt-6 space-x-4">
                <Button
                  type="submit"
                  className="bg-[#4285F4] hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md shadow-sm hover:shadow transition-all duration-200"
                  disabled={scanReposMutation.isPending}
                >
                  Scan Repositories
                </Button>
              </div>
            </form>
            
            {scanReposMutation.isPending && <LoadingStateScanner />}
            
            {!scanReposMutation.isPending && !comparisonData && <EmptyStateComparison hasError={hasError} />}
            
            {!scanReposMutation.isPending && comparisonData && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                {renderProjectOverview()}
                
                <h2 className="text-xl font-semibold mt-8 mb-4 text-[#4285F4]">Repository Overlaps</h2>
                
                {comparisonData.overlaps.length === 0 ? (
                  <div className="text-center py-12 bg-[#F8F9FA] rounded-lg border border-gray-100">
                    <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-[#E8F0FE]">
                      <i className="fas fa-check text-3xl text-[#4285F4]"></i>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">No overlaps detected</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      We didn't find any significant code overlaps between the repositories belonging to this user.
                    </p>
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