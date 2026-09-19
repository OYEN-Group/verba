import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AccountProfileForm } from '@/components/AccountProfileForm';
import { AccountSecurityForm } from '@/components/AccountSecurityForm';

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const email = user.email || '';
  const createdAt = user.created_at;

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto w-full pt-10 pb-24">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-[#101828] mb-1">Account</h1>
        <p className="text-[15px] text-[#667085]">
          Manage your personal information and account access.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section id="profile" className="bg-white border border-[#E5EAF0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden scroll-mt-24">
          <div className="px-6 py-5 border-b border-[#E5EAF0]">
            <h2 className="text-[16px] font-semibold text-[#101828]">Profile</h2>
            <p className="text-[14px] text-[#667085] mt-1">
              Update your personal details.
            </p>
          </div>
          <div className="p-6">
            <AccountProfileForm 
              initialName={name} 
              email={email} 
              createdAt={createdAt} 
            />
          </div>
        </section>

        {/* Billing & Plan Section (Mock) */}
        <section id="billing" className="bg-white border border-[#E5EAF0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden scroll-mt-24">
          <div className="px-6 py-5 border-b border-[#E5EAF0] flex justify-between items-center">
            <div>
              <h2 className="text-[16px] font-semibold text-[#101828]">Billing & Plan</h2>
              <p className="text-[14px] text-[#667085] mt-1">
                Manage your subscription and billing details.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <div>
                <div className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Current Plan</div>
                <div className="flex items-center space-x-2">
                  <span className="text-[18px] font-bold text-[#0F172A]">Free</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <p className="text-[14px] text-[#475569] mt-2">
                  Basic access to Verba writing and research features.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <button className="bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">
                  Upgrade to Professional
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E5EAF0]">
              <div>
                <div className="text-[13px] font-semibold text-[#64748B] mb-1">Payment Method</div>
                <div className="text-[14px] text-[#334155]">No payment method on file.</div>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#64748B] mb-1">Billing Email</div>
                <div className="text-[14px] text-[#334155]">{email}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Section (Mock) */}
        <section id="usage" className="bg-white border border-[#E5EAF0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden scroll-mt-24">
          <div className="px-6 py-5 border-b border-[#E5EAF0]">
            <h2 className="text-[16px] font-semibold text-[#101828]">Usage</h2>
            <p className="text-[14px] text-[#667085] mt-1">
              Track your AI allowance and feature usage for the current billing period.
            </p>
          </div>
          <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
              <span className="text-[14px] font-semibold text-[#334155]">Current period</span>
              <span className="text-[14px] text-[#64748B]">Sep 1 - Sep 30</span>
            </div>
            
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[15px] font-bold text-[#0F172A]">AI allowance</span>
                <span className="text-[14px] font-medium text-[#64748B]">70% used</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-3 mb-2 overflow-hidden">
                <div className="bg-[#141C2B] h-full rounded-full transition-all duration-500" style={{ width: '70%' }}></div>
              </div>
              <div className="text-[13px] text-[#64748B]">
                Resets on Oct 1
              </div>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-[#E5EAF0]">
              <h3 className="text-[14px] font-semibold text-[#334155] mb-3">Usage by feature</h3>
              
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[#475569]">Assistant</span>
                  <span className="text-[#64748B]">40%</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                  <div className="bg-[#64748B] h-full rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[#475569]">Deep Review</span>
                  <span className="text-[#64748B]">20%</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                  <div className="bg-[#64748B] h-full rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[#475569]">Research assistance</span>
                  <span className="text-[#64748B]">10%</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                  <div className="bg-[#64748B] h-full rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
            </div>
            
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="bg-white border border-[#E5EAF0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden scroll-mt-24">
          <div className="px-6 py-5 border-b border-[#E5EAF0]">
            <h2 className="text-[16px] font-semibold text-[#101828]">Security</h2>
            <p className="text-[14px] text-[#667085] mt-1">
              Manage your password and account security.
            </p>
          </div>
          <div className="p-6">
            <AccountSecurityForm />
          </div>
        </section>
      </div>
    </div>
  );
}
