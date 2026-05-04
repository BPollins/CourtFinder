import React from "react";
import { Github } from "lucide-react";

const Header = () => {
  return (
    <nav className="bg-black border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="text-white font-mono text-lg font-bold hover:text-cyan-400 transition-colors"
          >
            COURTFINDER
          </a>

          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-cyan-400 transition-colors p-2 hover:bg-gray-800 rounded-lg"
            aria-label="GitHub"
          >
            <Github size={20} />
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Header;
