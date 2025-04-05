import { apiRequest } from "./queryClient";
import type { 
  RepositoryAnalysisResponse, 
  FileWithIssuesResponse, 
  UserRepositoriesResponse,
  RepositoryComparisonResponse
} from "../types";

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

// Function to get a user's repositories
export async function getUserRepositories(username: string): Promise<UserRepositoriesResponse> {
  const response = await apiRequest(
    "GET",
    `/api/repositories?username=${encodeURIComponent(username)}`,
    undefined
  );
  return await response.json();
}

// Function to compare repositories and identify overlaps
export async function compareRepositories(repositoryIds: number[]): Promise<RepositoryComparisonResponse> {
  const response = await apiRequest(
    "POST",
    `/api/compare-repositories`,
    { repositoryIds }
  );
  return await response.json();
}

// Function to analyze all user repositories
export async function scanAllRepositories(username: string): Promise<RepositoryComparisonResponse> {
  const response = await apiRequest(
    "GET",
    `/api/scan-repositories?username=${encodeURIComponent(username)}`,
    undefined
  );
  return await response.json();
}

// Helper function to format date
export function formatDate(dateString?: string): string {
  // Return "unknown" if dateString is undefined, null, or not a valid string
  if (!dateString || typeof dateString !== 'string') {
    return "Unknown";
  }
  
  // Try to create a valid date object
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Unknown";
  }
  
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
export function formatNumber(num?: number): string {
  // Check if num is a valid number
  if (num === undefined || num === null || isNaN(num)) {
    return "0";
  }
  
  // Make sure num is a number type
  const numValue = Number(num);
  
  if (numValue >= 1000000) {
    return (numValue / 1000000).toFixed(1) + 'M';
  } else if (numValue >= 1000) {
    return (numValue / 1000).toFixed(1) + 'k';
  }
  return numValue.toString();
}
