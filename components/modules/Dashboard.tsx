'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientSupabase } from '@/lib/supabase';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ResearchSession, Analysis, Strategy, Creative, ActivityItem } from '@/types';

interface PipelineCounts {
  research: number;
  analysis: number;
  strategy: number;
  creative: number;
}

const OWNER_NAME = 'Lincoln';

export function Dashboard() {
  const [counts, setCounts] = useState<PipelineCounts>({
    research: 0,
    analysis: 0,
    strategy: 0,
    creative: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClientSupabase();

        const [sessionsRes, analysesRes, strategiesRes, creativesRes] = await Promise.all([
          supabase
            .from('research_sessions')
            .select('id, niche, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('analyses')
            .select('id, niche, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('strategies')
            .select('id, niche, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('creatives')
            .select('id, niche, type, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

        const sessions = (sessionsRes.data || []) as ResearchSession[];
        const analyses = (analysesRes.data || []) as Analysis[];
        const strategies = (strategiesRes.data || []) as Strategy[];
        const creatives = (creativesRes.data || []) as Creative[];

        // Get total counts
        const [sc, ac, stc, cc] = await Promise.all([
          supabase.from('research_sessions').select('id', { count: 'exact', head: true }),
          supabase.from('analyses').select('id', { count: 'exact', head: true }),
          supabase.from('strategies').select('id', { count: 'exact', head: true }),
          supabase.from('creatives').select('id', { count: 'exact', head: true }),
        ]);

        setCounts({
          research: sc.count || 0,
          analysis: ac.count || 0,
          strategy: stc.count || 0,
          creative: cc.count || 0,
        });

        // Build activity feed
        const items: ActivityItem[] = [
          ...sessions.map((s) => ({
            id: s.id,
            type: 'session' as const,
            label: `Research: ${s.niche || s.query || 'Session'}`,
            timestamp: s.created_at,
            status: s.status,
          })),
          ...analyses.map((a) => ({
            id: a.id,
            type: 'analysis' as const,
            label: `Analysis: ${a.niche || 'Analysis'}`,
            timestamp: a.created_at,
          })),
          ...strategies.map((s) => ({
            id: s.id,
            type: 'strategy' as const,
            label: `Strategy: ${s.niche || 'Strategy'}`,
            timestamp: s.created_at,
          })),
          ...creatives.map((c) => ({
            id: c.id,
            type: 'creative' as const,
            label: `Creative (${c.type}): ${c.niche || 'Creative'}`,
            timestamp: c.created_at,
          })),
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 8);

        setActivity(items);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const pipelineSteps = [
    { key: 'research', label: 'Research', href: '/research', color: 'blue', count: counts.research, icon: '◎' },
    { key: 'analysis', label: 'Analysis', href: '/analysis', color: 'indigo', count: counts.analysis, icon: '◈' },
    { key: 'strategy', label: 'Strategy', href: '/strategy', color: 'purple', count: counts.strategy, icon: '◆' },
    { key: 'creative', label: 'Creative', href: '/creative', color: 'green', count: counts.creative, icon: '◉' },
  ];

  const typeConfig: Record<string, { label: string; variant: 'blue' | 'indigo' | 'purple' | 'green' }> = {
    session: { label: 'Research', variant: 'blue' },
    analysis: { label: 'Analysis', variant: 'indigo' },
    strategy: { label: 'Strategy', variant: 'purple' },
    creative: { label: 'Creative', variant: 'green' },
  };

  function formatRelative(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-50 mb-1">
            {greeting}, {OWNER_NAME}.
          </h1>
          <p className="text-sm text-zinc-500">
            Your AI-powered advertising intelligence platform is ready.
          </p>
        </div>

        {/* Pipeline Overview */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Pipeline
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {pipelineSteps.map((step, i) => (
              <Link key={step.key} href={step.href}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      {step.icon}
                    </span>
                    {i < 3 && (
                      <svg
                        className="w-3 h-3 text-zinc-700"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{ position: 'absolute', right: -12 }}
                      >
                        <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span className="text-2xl font-bold text-zinc-100">
                      {loading ? '–' : step.count}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-zinc-400">{step.label}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {loading ? '...' : `${step.count} ${step.count === 1 ? 'item' : 'items'}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pipeline arrow indicators */}
          <div className="flex items-center justify-between mt-3 px-4">
            {pipelineSteps.map((step, i) => (
              <React.Fragment key={step.key}>
                <div className="flex-1 flex justify-center">
                  <span className="text-xs text-zinc-600">{step.label}</span>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className="flex items-center">
                    <div className="h-px w-6 bg-zinc-800" />
                    <svg className="w-3 h-3 text-zinc-700 -ml-1" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="col-span-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Recent Activity
            </h2>
            <Card noPad>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-zinc-600 text-sm">
                  Loading activity...
                </div>
              ) : activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-zinc-600" viewBox="0 0 20 20" fill="none">
                      <path d="M10 3v7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500 font-medium">No activity yet</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Start by running your first research session
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {activity.map((item) => {
                    const config = typeConfig[item.type];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant={config.variant} size="sm">
                            {config.label}
                          </Badge>
                          <span className="text-sm text-zinc-300 truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {item.status && <StatusBadge status={item.status} />}
                          <span className="text-xs text-zinc-600">{formatRelative(item.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Quick Launch */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Quick Launch
            </h2>
            <div className="space-y-2">
              <Link href="/research">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-indigo-800 hover:bg-zinc-800/50 transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" viewBox="0 0 16 16" fill="none">
                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-50">New Research</p>
                      <p className="text-xs text-zinc-600">Scrape Meta Ad Library</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/analysis">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-indigo-800 hover:bg-zinc-800/50 transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 16 16" fill="none">
                        <path d="M2 12l4-4 3 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-50">Run Analysis</p>
                      <p className="text-xs text-zinc-600">Extract insights from ads</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/strategy">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-indigo-800 hover:bg-zinc-800/50 transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2l6 3.5v5L8 14 2 10.5v-5L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-50">Build Strategy</p>
                      <p className="text-xs text-zinc-600">Campaign positioning</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/creative">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-indigo-800 hover:bg-zinc-800/50 transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 16 16" fill="none">
                        <path d="M2 14l3-1 8-8-2-2-8 8-1 3zM11 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-50">Generate Creative</p>
                      <p className="text-xs text-zinc-600">Copy, briefs & prompts</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
