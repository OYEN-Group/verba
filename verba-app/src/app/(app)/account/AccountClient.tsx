'use client';

import React, { useState, useEffect } from 'react';
import { User, CreditCard, BarChart2, Shield, Settings, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { AccountProfileForm } from '@/components/AccountProfileForm';
import { AccountSecurityForm } from '@/components/AccountSecurityForm';

interface AccountClientProps {
  initialName: string;
  email: string;
  createdAt: string;
}

export function AccountClient({ initialName, email, createdAt }: AccountClientProps) {
  const [activeTab, setActiveTab] = useState('profile');

  // Handle hash changes to open specific tabs
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['profile', 'billing', 'usage', 'security'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    
    // Initial check
    handleHashChange();
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    window.history.pushState(null, '', `#${tab}`);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard, description: 'Manage subscription and payment' },
    { id: 'usage', label: 'Usage', icon: BarChart2, description: 'Track your AI allowance' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Update password and security' }
  ];

  return (
    <div className="max-w-[1000px] mx-auto w-full pt-8 pb-24 px-4 md:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[32px] font-bold text-ink tracking-tight mb-2 flex items-center">
          <Settings className="mr-3 text-gold" size={32} />
          Account Settings
        </h1>
        <p className="text-[16px] text-foreground-secondary">
          Manage your personal information, subscription, and security preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-[240px] shrink-0">
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-white shadow-sm ring-1 ring-border-light text-ink font-semibold' 
                      : 'text-foreground-secondary hover:text-ink hover:bg-black/5 font-medium'
                  }`}
                >
                  <tab.icon 
                    size={18} 
                    className={`mr-3 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} 
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-border-light overflow-hidden">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-8 py-6 border-b border-border-light bg-[#FAFAFA]/50">
                  <h2 className="text-[18px] font-bold text-ink">Profile Details</h2>
                  <p className="text-[14px] text-foreground-secondary mt-1">
                    Update your public profile and email address.
                  </p>
                </div>
                <div className="p-8">
                  <AccountProfileForm 
                    initialName={initialName} 
                    email={email} 
                    createdAt={createdAt} 
                  />
                </div>
              </div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'billing' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-8 py-6 border-b border-border-light bg-[#FAFAFA]/50">
                  <h2 className="text-[18px] font-bold text-ink">Billing & Plan</h2>
                  <p className="text-[14px] text-foreground-secondary mt-1">
                    Manage your subscription, invoices, and billing method.
                  </p>
                </div>
                
                <div className="p-8 space-y-8">
                  {/* Current Plan Card */}
                  <div className="relative overflow-hidden rounded-2xl border border-border-light bg-gradient-to-br from-white to-[#F8FAFC]">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-[20px] font-bold text-ink">Free Plan</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20">
                              Active
                            </span>
                          </div>
                          <p className="text-[14px] text-foreground-secondary">
                            Basic access to Verba writing and research features.
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-[24px] font-bold text-ink">$0</div>
                          <div className="text-[13px] text-foreground-secondary">per month</div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-border-light flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <ul className="space-y-2">
                          <li className="flex items-center text-[13px] text-foreground-secondary">
                            <CheckCircle2 size={14} className="text-accent mr-2" />
                            Standard editor access
                          </li>
                          <li className="flex items-center text-[13px] text-foreground-secondary">
                            <CheckCircle2 size={14} className="text-accent mr-2" />
                            Limited AI usage
                          </li>
                        </ul>
                        <button className="flex items-center justify-center px-5 py-2.5 bg-ink text-white text-[14px] font-semibold rounded-lg hover:bg-ink-secondary transition-colors shadow-sm">
                          Upgrade to Professional <Zap size={16} className="ml-2 text-gold" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div>
                    <h4 className="text-[15px] font-bold text-ink mb-4">Billing Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border-light bg-white">
                        <div className="text-[12px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Payment Method</div>
                        <div className="text-[14px] text-ink font-medium">No card on file</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border-light bg-white">
                        <div className="text-[12px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Billing Email</div>
                        <div className="text-[14px] text-ink font-medium">{email}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USAGE TAB */}
            {activeTab === 'usage' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-8 py-6 border-b border-border-light bg-[#FAFAFA]/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[18px] font-bold text-ink">Usage & Limits</h2>
                      <p className="text-[14px] text-foreground-secondary mt-1">
                        Track your AI allowance for the current billing cycle.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Current Period</div>
                      <div className="text-[14px] font-semibold text-ink bg-slate-100 px-3 py-1 rounded-md">Sep 1 – Sep 30</div>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-10">
                  {/* Master Progress */}
                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h3 className="text-[16px] font-bold text-ink">AI Allowance</h3>
                        <p className="text-[13px] text-foreground-secondary mt-0.5">Your available generation credits.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[20px] font-bold text-ink">70%</span>
                        <span className="text-[14px] text-foreground-secondary ml-1">used</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                      <div className="bg-accent h-full rounded-full transition-all duration-1000 ease-out" style={{ width: '70%' }}></div>
                    </div>
                    <p className="text-[13px] text-foreground-muted flex items-center">
                      <ArrowRight size={12} className="mr-1" />
                      Usage resets on Oct 1
                    </p>
                  </div>

                  {/* Feature Breakdown */}
                  <div>
                    <h4 className="text-[15px] font-bold text-ink mb-5">Usage by Feature</h4>
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between text-[14px] font-medium mb-2">
                          <span className="text-ink">Writing Assistant</span>
                          <span className="text-foreground-secondary">40%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-slate-400 h-full rounded-full" style={{ width: '40%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-[14px] font-medium mb-2">
                          <span className="text-ink">Deep Review</span>
                          <span className="text-foreground-secondary">20%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-slate-400 h-full rounded-full" style={{ width: '20%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-[14px] font-medium mb-2">
                          <span className="text-ink">Research Assistance</span>
                          <span className="text-foreground-secondary">10%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-slate-400 h-full rounded-full" style={{ width: '10%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-8 py-6 border-b border-border-light bg-[#FAFAFA]/50">
                  <h2 className="text-[18px] font-bold text-ink">Security</h2>
                  <p className="text-[14px] text-foreground-secondary mt-1">
                    Manage your password and secure your account.
                  </p>
                </div>
                <div className="p-8">
                  <AccountSecurityForm />
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
