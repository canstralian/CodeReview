import React from 'react';
import { Link } from 'wouter';

const Footer: React.FC = () => {
  return (
    <footer className="py-6 mt-auto text-center text-sm text-gray-500">
      <div className="mb-2">
        <Link href="/">
          <a className="mx-2 hover:text-[#4285F4]">Single Repository</a>
        </Link>
        <Link href="/repo-comparison">
          <a className="mx-2 hover:text-[#4285F4]">Repository Scanner</a>
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
