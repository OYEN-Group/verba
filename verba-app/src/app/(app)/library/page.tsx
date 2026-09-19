import React from 'react';

export default function LibraryPage() {
  return (
    <div className="flex flex-col h-full bg-[#F6F8FB] overflow-y-auto">
      <header className="px-8 py-10 bg-white border-b border-border-light shrink-0">
        <div className="max-w-[1000px] mx-auto">
          <h1 className="text-[28px] font-semibold text-[#0B1628] mb-2 font-serif">Research Library</h1>
          <p className="text-[15px] text-foreground-secondary">
            Manage your academic sources, PDFs, and citations. (Coming soon)
          </p>
        </div>
      </header>
      <div className="flex-1 w-full max-w-[1000px] mx-auto px-8 py-8 flex items-center justify-center">
        <p className="text-foreground-secondary text-[14px]">The research library is currently under development.</p>
      </div>
    </div>
  );
}
