import React from 'react';
import { Link } from 'wouter';

const Footer: React.FC = () => {
  return (
    <footer className="py-6 mt-auto text-center text-sm text-gray-500">
      <div className="mb-2">
        <Link href="/">
          <span className="mx-2 hover:text-[#4285F4] cursor-pointer">Single Repository</span>
        </Link>
        <Link href="/repo-comparison">
          <span className="mx-2 hover:text-[#4285F4] cursor-pointer">Repository Scanner</span>
        </Link>
        <a href="#" className="mx-2 hover:text-[#4285F4]">Documentation</a>
        <a href="#" className="mx-2 hover:text-[#4285F4]">GitHub</a>
        <a href="#" className="mx-2 hover:text-[#4285F4]">Privacy</a>
      </div>
      <div>© {new Date().getFullYear()} CodeReview | An AI-powered code analysis and repository comparison tool</div>
    </footer>
  );
};

export default Footer;
