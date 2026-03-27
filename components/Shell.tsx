'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: '/' },
  { key: 'research', label: 'Research', href: '/research' },
  { key: 'analysis', label: 'Analysis', href: '/analysis' },
  { key: 'strategy', label: 'Strategy', href: '/strategy' },
  { key: 'creative', label: 'Creative', href: '/creative' },
];

interface SettingsModalProps {
  onClose: () => void;
}

function SettingsModal({ onClose }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-dark">Anthropic API Key</label>
            <input
              type="password"
              className="input-dark"
              placeholder="sk-ant-..."
              defaultValue=""
            />
            <p className="text-xs text-zinc-600 mt-1">
              Used for AI analysis, strategy, and creative generation. Set in .env.local for production.
            </p>
          </div>

          <div>
            <label className="label-dark">Supabase URL</label>
            <input
              type="text"
              className="input-dark"
              placeholder="https://your-project.supabase.co"
            />
          </div>

          <div>
            <label className="label-dark">Supabase Anon Key</label>
            <input
              type="password"
              className="input-dark"
              placeholder="your-anon-key"
            />
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-600">
              Note: API keys entered here are not persisted. Configure them in{' '}
              <code className="text-indigo-400">.env.local</code> for permanent use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Top Navigation */}
      <header
        className="flex items-center justify-between px-5 border-b shrink-0"
        style={{
          height: 52,
          background: 'var(--surface-1)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Agency OS</span>
        </div>

        {/* Nav Tabs */}
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative px-3 py-1.5 text-sm rounded-md transition-all duration-150 ${
                  isActive
                    ? 'text-zinc-50 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 bg-zinc-800 rounded-md -z-10" />
                )}
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M12.3 9.3l.8 1.3-1.4 1.4-1.3-.8a5 5 0 01-1.2.5L8.8 13H6.2l-.4-1.3a5 5 0 01-1.2-.5l-1.3.8L1.9 10.6l.8-1.3A5 5 0 012.5 8V7a5 5 0 01.2-1.3L1.9 4.4l1.4-1.4 1.3.8a5 5 0 011.2-.5L6.2 2h2.6l.4 1.3a5 5 0 011.2.5l1.3-.8 1.4 1.4-.8 1.3A5 5 0 0112.5 7v1a5 5 0 01-.2 1.3z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
