import { RepositoryFile } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

interface FileExplorerProps {
  files: RepositoryFile[];
  onSelectFile: (file: RepositoryFile) => void;
  selectedFilePath: string | undefined;
  isLoading: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  onSelectFile, 
  selectedFilePath,
  isLoading 
}) => {
  // Sort files first by type (directories first), then by path
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    return a.filePath.localeCompare(b.filePath);
  });

  // Group files by directory structure
  const fileTree = buildFileTree(sortedFiles);

  return (
    <div className="overflow-y-auto max-h-96 code-scroll">
      {isLoading ? (
        // Loading skeleton
        Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex items-center py-1 px-2 text-sm">
            <Skeleton className="h-4 w-4 mr-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))
      ) : (
        // Render file tree
        renderFileTree(fileTree, "", files, onSelectFile, selectedFilePath)
      )}
    </div>
  );
};

// Helper function to build a file tree structure
function buildFileTree(files: RepositoryFile[]) {
  const root: Record<string, any> = {};
  
  for (const file of files) {
    // Skip files with invalid properties
    if (!file || !file.filePath || typeof file.filePath !== 'string') {
      continue;
    }
    
    const parts = file.filePath.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Skip empty path segments
      if (!part) continue;
      
      const isLastPart = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');
      
      if (!current[part]) {
        current[part] = {
          path,
          isFile: isLastPart && file.type === 'file',
          children: {},
          file: isLastPart ? file : null
        };
      }
      
      // Make sure children exists before navigating to it
      if (!current[part].children) {
        current[part].children = {};
      }
      
      current = current[part].children;
    }
  }
  
  return root;
}

// Helper function to recursively render the file tree
function renderFileTree(
  tree: Record<string, any>, 
  indent: string, 
  allFiles: RepositoryFile[], 
  onSelectFile: (file: RepositoryFile) => void, 
  selectedFilePath: string | undefined
) {
  // Guard against null or undefined tree
  if (!tree) return null;
  
  return Object.keys(tree).sort((a, b) => {
    // Check if tree items exist
    if (!tree[a] || !tree[b]) return 0;
    
    const aIsFile = tree[a].isFile;
    const bIsFile = tree[b].isFile;
    if (aIsFile !== bIsFile) {
      return aIsFile ? 1 : -1;
    }
    return a.localeCompare(b);
  }).map((key) => {
    const item = tree[key];
    // Skip invalid items
    if (!item) return null;
    
    const file = item.file;
    const isFile = item.isFile;
    const isSelected = selectedFilePath === item.path;
    
    return (
      <div key={item.path}>
        <div 
          className={`flex items-center py-1 text-sm hover:bg-gray-50 cursor-pointer px-2 ${indent} ${
            isSelected ? 'border-l-2 border-[#4285F4] bg-blue-50' : ''
          }`}
          onClick={() => {
            if (file) {
              onSelectFile(file);
            } else {
              // For directories, find any file inside this directory to get its info
              const dirFile = allFiles.find(f => f && f.filePath && f.filePath.startsWith(item.path + '/') && f.type === 'dir');
              if (dirFile) {
                onSelectFile(dirFile);
              }
            }
          }}
        >
          <i className={`${isFile ? 'fas fa-file-code text-[#4285F4]' : 'fas fa-folder text-[#FBBC05]'} mr-2`}></i>
          <span>{key}</span>
        </div>
        {!isFile && item.children && Object.keys(item.children).length > 0 && (
          <div className="pl-5">
            {renderFileTree(item.children, indent + 'pl-5', allFiles, onSelectFile, selectedFilePath)}
          </div>
        )}
      </div>
    );
  });
}

export default FileExplorer;
