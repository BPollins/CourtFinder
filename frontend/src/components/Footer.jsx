import React from "react";

const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-800 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-gray-500 text-sm font-mono text-center">
          CourtFinder · Built with React · Hosted on AWS Lambda + S3 + CloudFront
        </p>
      </div>
    </footer>
  );
};

export default Footer;
