import { apiRequest } from "./queryClient";
import type { RepositoryAnalysisResponse, FileWithIssuesResponse } from "../types";

// Function to get repository analysis
export async function analyzeRepository(url: string): Promise<RepositoryAnalysisResponse> {
  const response = await apiRequest("GET", `/api/repository?url=${encodeURIComponent(url)}`, undefined);
  return await response.json();
}

// Function to get file content with issues
export async function getFileWithIssues(repo: string, path: string): Promise<FileWithIssuesResponse> {
  const response = await apiRequest(
    "GET", 
    `/api/file?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`, 
    undefined
  );
  return await response.json();
}

// Helper function to format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return "Today";
  } else if (diffInDays === 1) {
    return "Yesterday";
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}

// Helper function to format numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}
