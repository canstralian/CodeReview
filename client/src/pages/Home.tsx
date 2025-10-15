import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { analyzeRepository } from "../lib/github";
import Header from "../components/Header";
import SearchForm from "../components/SearchForm";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import RepositoryView from "../components/RepositoryView";
import Footer from "../components/Footer";
import ConversationHighlights from "../components/ConversationHighlights";
import type { RepositoryAnalysisResponse } from "../types";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [repositoryData, setRepositoryData] = useState<RepositoryAnalysisResponse | null>(null);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  const analyzeRepoMutation = useMutation({
    mutationFn: analyzeRepository,
    onSuccess: (data) => {
      setRepositoryData(data);
      setHasError(false); // Reset error state on success
    },
    onError: (error) => {
      setHasError(true); // Set error state
      toast({
        title: "Error analyzing repository",
        description: error instanceof Error ? error.message : "Please check the repository URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleReviewCode = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Empty search query",
        description: "Please enter a GitHub repository URL or search query.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for GitHub repository URL format
    const isGitHubUrl = /github\.com\/[^\/]+\/[^\/]+/i.test(searchQuery);
    
    if (!isGitHubUrl) {
      // If it doesn't look like a GitHub URL, show a more helpful message
      toast({
        title: "Invalid GitHub URL format",
        description: "Please enter a valid GitHub repository URL in the format: https://github.com/owner/repo",
        variant: "destructive",
      });
      return;
    }

    analyzeRepoMutation.mutate(searchQuery);
  };

  const handleDebugCode = () => {
    // For now, debug and review do the same thing
    handleReviewCode();
  };

  const clearSearch = () => {
    setSearchQuery("");
    // Don't clear results if they're already shown
  };

  return (
    <div className="bg-white text-[#202124] min-h-screen">
      <div className="container mx-auto px-4 flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow flex flex-col items-center justify-start">
          <SearchForm 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleReviewCode={handleReviewCode}
            handleDebugCode={handleDebugCode}
            clearSearch={clearSearch}
            isLoading={analyzeRepoMutation.isPending}
          />
          
          {analyzeRepoMutation.isPending && <LoadingState />}
          
          {!analyzeRepoMutation.isPending && !repositoryData && (
            <>
              <EmptyState hasError={hasError} />
              <ConversationHighlights />
            </>
          )}
          
          {!analyzeRepoMutation.isPending && repositoryData && (
            <RepositoryView data={repositoryData} />
          )}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
