'use client';

import React, { useState } from 'react';
import { DocumentUploader } from '@/components/DocumentUploader';
import { FileText, Search, Clock, Sparkles, User, HelpCircle, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { NewWorkModal } from '@/components/NewWorkModal';

interface Document {
  id: string;
  title: string;
  word_count: number;
  status: string;
  created_at: string;
}

interface Props {
  documents: Document[];
  userName: string | null;
}

export function DashboardContent({ documents, userName }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'Drafts') {
      matchesStatus = doc.status === 'draft';
    } else if (statusFilter === 'In progress') {
      matchesStatus = ['uploaded', 'processing', 'analyzing'].includes(doc.status);
    } else if (statusFilter === 'Ready') {
      matchesStatus = ['ready', 'analyzed'].includes(doc.status);
    } else if (statusFilter === 'Shared') {
      matchesStatus = false; // Add real shared logic here when available in schema
    }

    return matchesSearch && matchesStatus;
  });

  const greeting = userName ? `Good afternoon, ${userName}.` : 'Welcome back.';

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background-secondary">
      {/* Top Utility Bar */}
      <div className="h-[64px] border-b border-border-light bg-white flex items-center justify-between px-8 shrink-0 sticky top-0 z-10">
        <div className="relative w-full max-w-[420px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={15} className="text-foreground-muted" />
          </div>
          <input
            type="text"
            placeholder="Search your documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-background-secondary border border-transparent rounded-[8px] text-[13px] text-ink placeholder-foreground-muted focus:outline-none focus:bg-white focus:border-border-light focus:ring-1 focus:ring-accent/20 transition-all"
          />
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-foreground-secondary hover:text-ink transition-colors p-1.5 rounded-full hover:bg-slate-100">
            <HelpCircle size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <User size={16} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 md:p-12 max-w-[1280px] mx-auto w-full">
        {/* Welcome Area */}
        <div className="mb-12 flex justify-between items-start">
          <div className="max-w-[700px]">
            <p className="text-[12px] font-bold tracking-widest text-foreground-muted uppercase mb-3">WELCOME BACK</p>
            <h1 className="text-[44px] md:text-[54px] font-bold text-ink mb-2 leading-tight tracking-tight font-serif">
              Continue your work<span className="text-gold">.</span>
            </h1>
            <p className="text-[17px] text-foreground-secondary mt-2">
              Turn your ideas into well-researched, well-written work with Verba.
            </p>
          </div>
          <div className="hidden lg:flex items-start pl-8 border-l border-gold/40 h-full max-w-[260px] mt-8">
            <p className="text-[16px] text-foreground-secondary italic font-serif">
              Better writing<br/>builds brighter futures.
            </p>
          </div>
        </div>

        {/* Entry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Craft a concept */}
          <button 
            onClick={() => setIsNewWorkModalOpen(true)}
            className="bg-[#FDFBF7] border border-gold-border rounded-[16px] p-6 shadow-sm hover:shadow-md transition-all text-left flex flex-col group h-[220px]"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-gold-border/30 text-gold-hover group-hover:bg-gold-border/50 transition-colors">
              <Sparkles size={20} />
            </div>
            <h2 className="text-[18px] font-bold text-ink mb-2 font-serif">Craft a concept</h2>
            <p className="text-[14px] text-foreground-secondary leading-relaxed mb-6">
              Have a rough thought, topic or question? Develop it into a clear direction and plan with Verba.
            </p>
            <div className="mt-auto w-full h-[40px] flex items-center justify-center bg-gold-hover text-white text-[14px] font-medium rounded-lg">
              Begin developing &rarr;
            </div>
          </button>

          {/* Open blank canvas */}
          <button 
            onClick={() => setIsNewWorkModalOpen(true)} 
            className="bg-white border border-border-light rounded-[16px] p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all text-left flex flex-col group h-[220px]"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-slate-50 text-slate-600 border border-border-light group-hover:bg-slate-100 transition-colors">
              <FileText size={20} />
            </div>
            <h2 className="text-[18px] font-bold text-ink mb-2 font-serif">Open blank canvas</h2>
            <p className="text-[14px] text-foreground-secondary leading-relaxed mb-6">
              Know what you want to write? Open a clean document and begin.
            </p>
            <div className="mt-auto w-full h-[40px] flex items-center justify-center bg-white border border-border-light text-ink text-[14px] font-medium rounded-lg hover:bg-slate-50 transition-colors">
              New document
            </div>
          </button>

          {/* Upload existing work */}
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-white border border-border-light rounded-[16px] p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all text-left flex flex-col group h-[220px]"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-slate-50 text-slate-600 border border-border-light group-hover:bg-slate-100 transition-colors">
              <Upload size={20} />
            </div>
            <h2 className="text-[18px] font-bold text-ink mb-2 font-serif">Upload existing work</h2>
            <p className="text-[14px] text-foreground-secondary leading-relaxed mb-6">
              Already started? Bring your existing document into Verba and continue developing it here.
            </p>
            <div className="mt-auto w-full h-[40px] flex items-center justify-center bg-white border border-border-light text-ink text-[14px] font-medium rounded-lg hover:bg-slate-50 transition-colors">
              Choose document
            </div>
          </button>
        </div>

      {/* User Documents */}
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
          <div>
            <div className="flex items-center justify-between w-full md:w-auto mb-4">
              <h2 className="text-[26px] font-bold text-ink font-serif tracking-tight">Recent work</h2>
              <Link href="/documents" className="text-[14px] font-medium text-accent hover:text-accent-hover transition-colors flex items-center md:ml-6">
                View all &rarr;
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'Drafts', 'In progress', 'Ready', 'Shared'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
                    statusFilter === filter
                      ? 'bg-gold border border-gold text-white'
                      : 'bg-[#F1F5F9] border border-transparent text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-foreground-muted" />
              </div>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[240px] pl-9 pr-4 py-2 bg-white border border-border-light rounded-[8px] text-[13px] text-ink placeholder-foreground-muted focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all shadow-sm"
              />
            </div>
            <button className="px-4 py-2 bg-white border border-border-light text-[#475569] text-[13px] font-medium rounded-[8px] hover:bg-slate-50 transition-colors shadow-sm flex items-center">
              Last updated <span className="ml-2 text-[10px]">&#9660;</span>
            </button>
            <button className="p-2 bg-white border border-border-light text-[#475569] rounded-[8px] hover:bg-slate-50 transition-colors shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
            </button>
          </div>
        </div>

        {!documents || documents.length === 0 ? (
          <div className="flex flex-col h-[180px] justify-center">
            <p className="text-[14px] text-foreground-secondary mb-1">Your work will appear here.</p>
            <p className="text-[14px] text-foreground-muted">
              Start by developing an idea, creating a blank document, or uploading existing work.
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col h-[180px] justify-center">
            <p className="text-[14px] text-foreground-secondary mb-1">No documents found for &quot;{searchQuery}&quot;</p>
            <button onClick={() => setSearchQuery('')} className="text-[14px] text-accent hover:underline w-fit">
              Clear search
            </button>
          </div>
        ) : (
          <div className="bg-white border border-border-light rounded-[10px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border-light bg-white">
                    <th className="px-6 py-4 text-[11px] font-bold text-foreground-muted uppercase tracking-widest w-2/5">Document Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-foreground-muted uppercase tracking-widest text-left">Project</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-foreground-muted uppercase tracking-widest text-center">Words</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-foreground-muted uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-foreground-muted uppercase tracking-widest text-right">Updated</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-foreground-muted uppercase tracking-widest text-center w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {filteredDocuments.map((doc) => {
                    const statusConfig = {
                      uploaded: { label: 'Uploaded', style: 'bg-slate-100 text-slate-600' },
                      processing: { label: 'Analyzing', style: 'bg-accent/10 text-accent' },
                      analyzing: { label: 'Analyzing', style: 'bg-accent/10 text-accent' },
                      ready: { label: 'Ready', style: 'bg-[#E6F4EA] text-[#137333]' },
                      analyzed: { label: 'Ready', style: 'bg-[#E6F4EA] text-[#137333]' },
                      failed: { label: 'Failed', style: 'bg-[#FCE8E6] text-[#C5221F]' },
                      draft: { label: 'Draft', style: 'bg-[#F1F5F9] text-[#475569]' }
                    }[doc.status as string] || { label: 'Draft', style: 'bg-[#F1F5F9] text-[#475569]' };

                    // We are displaying "Thesis" as the generic project since there is no project model.
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors group bg-white h-[68px]">
                        <td className="px-6 py-4">
                          <Link href={`/workspace/${doc.id}`} className="flex items-center w-fit max-w-[400px]">
                            <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center mr-4 text-slate-400 shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-ink group-hover:text-accent transition-colors truncate">
                                {doc.title}
                              </span>
                              {doc.title.toLowerCase().includes('draft') && (
                                <span className="text-[12px] text-foreground-secondary mt-0.5">Literature Review Draft</span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <span className="text-[13px] font-medium text-foreground-secondary">
                            Thesis
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[13px] font-medium text-foreground-secondary">
                            {doc.word_count ? doc.word_count.toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded text-[12px] font-bold ${statusConfig.style}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[13px] font-medium text-foreground-secondary">
                            {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Link 
                              href={`/workspace/${doc.id}`}
                              className="text-foreground-muted hover:text-ink transition-colors p-1 rounded hover:bg-slate-200"
                              aria-label="Document options"
                            >
                              <span className="font-bold tracking-widest text-[14px]">&middot;&middot;&middot;</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <NewWorkModal 
        isOpen={isNewWorkModalOpen} 
        onClose={() => setIsNewWorkModalOpen(false)} 
        onUploadSelect={() => setIsUploadModalOpen(true)}
      />

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-[480px] overflow-hidden flex flex-col relative">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-foreground-muted hover:text-ink hover:bg-slate-100 rounded transition-colors z-10"
            >
              <X size={20} />
            </button>
            <div className="p-2 h-[340px]">
              <DocumentUploader />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
