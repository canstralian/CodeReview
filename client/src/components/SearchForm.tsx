import { Button } from "@/components/ui/button";

interface SearchFormProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleReviewCode: () => void;
  handleDebugCode: () => void;
  clearSearch: () => void;
  isLoading: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchQuery,
  setSearchQuery,
  handleReviewCode,
  handleDebugCode,
  clearSearch,
  isLoading
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleReviewCode();
  };

  return (
    <div className="w-full max-w-2xl px-4">
      <form className="mb-8" onSubmit={handleSubmit}>
        <div className="relative">
          <div className="flex items-center bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg focus-within:shadow-lg transition-shadow duration-200">
            <div className="pl-4 text-gray-400">
              <i className="fas fa-search"></i>
            </div>
            <input 
              type="text" 
              placeholder="Enter GitHub repository URL (e.g., https://github.com/facebook/react)"
              className="w-full py-3 px-4 outline-none rounded-full text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search for GitHub repository"
              disabled={isLoading}
            />
            {searchQuery && (
              <div className="pr-4 text-gray-400">
                <i className="fas fa-times cursor-pointer" onClick={clearSearch}></i>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-center mt-6 space-x-4">
          <Button
            type="submit"
            className="bg-[#4285F4] hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md shadow-sm hover:shadow transition-all duration-200"
            disabled={isLoading}
          >
            Review Code
          </Button>
          <Button
            type="button"
            className="bg-[#34A853] hover:bg-green-600 text-white font-medium py-2 px-6 rounded-md shadow-sm hover:shadow transition-all duration-200"
            onClick={handleDebugCode}
            disabled={isLoading}
          >
            Debug Code
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
