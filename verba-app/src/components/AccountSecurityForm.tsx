'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { logout } from '@/app/(auth)/actions';

export function AccountSecurityForm() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setPassword('');
      setPasswordConfirm('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Password Update */}
      <form onSubmit={handleUpdatePassword} className="space-y-5">
        <h3 className="text-[15px] font-bold text-ink">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-foreground-secondary">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-border-light rounded-xl text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-foreground-secondary">Confirm Password</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-border-light rounded-xl text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium rounded-xl flex items-center">
            <ShieldAlert size={16} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end pt-3">
          {success && (
            <span className="flex items-center text-status-success font-medium text-[13px] mr-4 animate-in fade-in duration-300">
              <CheckCircle size={16} className="mr-1.5" /> Password updated successfully
            </span>
          )}
          <button
            type="submit"
            disabled={saving || !password}
            className="h-[40px] px-5 bg-ink text-white font-semibold rounded-xl hover:bg-ink-secondary transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      <div className="h-px bg-border-light w-full" />

      {/* Session / Sign out */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-ink mb-1">Sign out of Verba</h3>
          <p className="text-[13px] text-foreground-secondary max-w-[400px]">
            Sign out of your account on this device. You will need to log in again to access your documents.
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="h-[36px] px-4 bg-white border border-border-light text-ink font-semibold rounded-lg hover:bg-black/5 transition-colors text-[13px] shadow-sm flex items-center">
            <LogOut size={16} className="mr-2 text-foreground-muted" />
            Sign out
          </button>
        </form>
      </div>

      <div className="h-px bg-border-light w-full" />

      {/* Danger Zone */}
      <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-start">
            <div className="mt-0.5 bg-red-100 p-2 rounded-lg mr-4 shrink-0">
              <ShieldAlert size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-red-900 mb-1">Danger Zone</h3>
              <p className="text-[13px] text-red-700 max-w-[400px]">
                Permanently delete your account, documents, and all associated data. This action is irreversible.
              </p>
              <p className="text-[12px] font-medium text-red-500 mt-3">
                Account deletion is currently only available by contacting support.
              </p>
            </div>
          </div>
          <button
            disabled
            className="h-[36px] px-4 bg-red-600 text-white font-semibold rounded-lg text-[13px] opacity-50 cursor-not-allowed shadow-sm shrink-0 whitespace-nowrap"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
