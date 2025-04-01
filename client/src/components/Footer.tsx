import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-6 mt-auto text-center text-sm text-gray-500">
      <div className="mb-2">
        <a href="#" className="mx-2 hover:text-[#4285F4]">About</a>
        <a href="#" className="mx-2 hover:text-[#4285F4]">Documentation</a>
        <a href="#" className="mx-2 hover:text-[#4285F4]">GitHub</a>
        <a href="#" className="mx-2 hover:text-[#4285F4]">Privacy</a>
        <a href="#" className="mx-2 hover:text-[#4285F4]">Terms</a>
      </div>
      <div>© {new Date().getFullYear()} CodeReview | An AI-powered code analysis tool</div>
    </footer>
  );
};

export default Footer;
