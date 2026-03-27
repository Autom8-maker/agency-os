'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClientSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import type { ResearchSession } from '@/types';

interface ScraperLog {
  message: string;
  type: 'info' | 'success' | 'error' | 'step';
  timestamp: Date;
}

export function Research() {
  const [query, setQuery] = useState('');
  const [niche, setNiche] = useState('');
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  async function loadSessions() {
    const supabase = createClientSupabase();
    const { data } = await supabase
      .from('research_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setSessions((data as ResearchSession[]) || []);
  }

  function addLog(message: string, type: ScraperLog['type'] = 'info') {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }]);
  }

  async function handleRun() {
    if (!query.trim() || !niche.trim()) return;

    setLoading(true);
    setLogs([]);
    setSelectedSession(null);

    try {
      // Step 1: Create session
      addLog(`Creating research session for "${niche}"...`, 'step');
      const supabase = createClientSupabase();
      const { data: session, error: sessionError } = await supabase
        .from('research_sessions')
        .insert({ niche: niche.trim(), query: query.trim(), status: 'pending' })
        .select()
        .single();

      if (sessionError || !session) {
        addLog(`Failed to create session: ${sessionError?.message || 'Unknown error'}`, 'error');
        setLoading(false);
        return;
      }

      addLog(`Session created (${session.id.slice(0, 8)}...)`, 'success');
      setActiveSessionId(session.id);
      await loadSessions();

      // Step 2: Start scrape
      addLog(`Starting Meta Ad Library scrape for "${query}"...`, 'step');
      addLog('Launching headless browser...', 'info');
      addLog('Navigating to ad library...', 'info');

      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, query: query.trim(), niche: niche.trim() }),
      });

      const scrapeData = await scrapeRes.json();

      if (!scrapeRes.ok || !scrapeData.success) {
        addLog(`Scrape error: ${scrapeData.error || 'Unknown error'}`, 'error');
        addLog('Session saved with 0 ads. You can still run analysis on mock data.', 'info');
      } else {
        addLog(`Scrape complete. Found ${scrapeData.count} ads.`, 'success');
        addLog(`Ads stored in database.`, 'info');
      }

      // Reload sessions and select the new one
      await loadSessions();
      const { data: updatedSession } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      if (updatedSession) {
        setSelectedSession(updatedSession as ResearchSession);
        addLog(`Session complete. Status: ${updatedSession.status}`, updatedSession.status === 'done' ? 'success' : 'info');
      }
    } catch (err) {
      addLog(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
    } finally {
      setLoading(false);
      setActiveSessionId(null);
    }
  }

  const filteredSessions = sessions.filter((s) => {
    const text = searchText.toLowerCase();
    return (
      s.niche.toLowerCase().includes(text) ||
      s.query.toLowerCase().includes(text)
    );
  });

  const logColors = {
    info: 'text-zinc-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
    step: 'text-indigo-400 font-medium',
  };

  const logPrefixes = {
    info: '  ',
    success: '✓ ',
    error: '✕ ',
    step: '→ ',
  };

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="panel-left p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            New Research Session
          </h2>

          <div className="space-y-3">
            <div>
              <label className="label-dark">Niche / Market</label>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g. Weight Loss Supplements"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="label-dark">Search Query</label>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g. fat burner supplement 2024"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={!query.trim() || !niche.trim()}
              onClick={handleRun}
            >
              {loading ? 'Running Scrape...' : 'Run Research'}
            </Button>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Sessions
            </h2>
            <span className="text-xs text-zinc-600">{sessions.length}</span>
          </div>

          <input
            type="text"
            className="input-dark mb-2"
            placeholder="Search sessions..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-zinc-600">
                  {sessions.length === 0 ? 'No sessions yet' : 'No results found'}
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedSession?.id === session.id
                      ? 'bg-indigo-950 border border-indigo-800'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-zinc-200 truncate">{session.niche}</span>
                    <StatusBadge status={session.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 truncate">{session.query}</span>
                    <span className="text-xs text-zinc-600 shrink-0 ml-1">
                      {session.ad_count} ads
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="panel-right p-6">
        {loading ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-zinc-200">Scraper Running</h2>
            </div>

            {/* Terminal output */}
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className={`mb-1 ${logColors[log.type]}`}>
                  <span className="text-zinc-700 mr-2">
                    {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span className="opacity-70">{logPrefixes[log.type]}</span>
                  {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
              {loading && (
                <div className="flex items-center gap-2 mt-2 text-zinc-600">
                  <span className="spinner inline-block" style={{ width: 10, height: 10 }} />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </div>
        ) : selectedSession ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">{selectedSession.niche}</h2>
                <p className="text-sm text-zinc-500 mt-0.5">"{selectedSession.query}"</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedSession.status} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card>
                <p className="text-xs text-zinc-500 mb-1">Ads Found</p>
                <p className="text-2xl font-bold text-zinc-100">{selectedSession.ad_count}</p>
              </Card>
              <Card>
                <p className="text-xs text-zinc-500 mb-1">Status</p>
                <StatusBadge status={selectedSession.status} />
              </Card>
              <Card>
                <p className="text-xs text-zinc-500 mb-1">Session ID</p>
                <p className="text-xs font-mono text-zinc-400">{selectedSession.id.slice(0, 12)}...</p>
              </Card>
            </div>

            {/* Log output if available */}
            {logs.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-64 mb-4">
                {logs.map((log, i) => (
                  <div key={i} className={`mb-1 ${logColors[log.type]}`}>
                    <span className="text-zinc-700 mr-2">
                      {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                    {logPrefixes[log.type]}{log.message}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <a href="/analysis">
                <Button variant="primary" size="sm">
                  Take to Analysis →
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSession(null);
                  setLogs([]);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-700" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-1">Ready to Research</h3>
            <p className="text-xs text-zinc-600 max-w-xs">
              Enter a niche and search query to scrape the Meta Ad Library. Results will appear here in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
