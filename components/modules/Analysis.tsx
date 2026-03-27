'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardGrid } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ResearchSession, Analysis, AnalysisItem, AdvertiserInfo } from '@/types';

const STRENGTH_CONFIG = {
  high: { variant: 'green' as const, label: 'High' },
  medium: { variant: 'amber' as const, label: 'Med' },
  low: { variant: 'default' as const, label: 'Low' },
};

function AnalysisItemCard({ item, index }: { item: AnalysisItem; index: number }) {
  return (
    <div className="flex gap-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
      <span className="text-xs font-mono text-zinc-600 pt-0.5 w-5 shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm text-zinc-200 leading-snug">{item.text}</p>
          {item.strength && (
            <Badge variant={STRENGTH_CONFIG[item.strength]?.variant} size="sm">
              {STRENGTH_CONFIG[item.strength]?.label}
            </Badge>
          )}
        </div>
        {item.frequency !== undefined && (
          <p className="text-xs text-zinc-600">Used in ~{item.frequency} ads</p>
        )}
        {item.notes && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.notes}</p>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  items,
  emptyText,
  variant = 'default',
}: {
  title: string;
  items: AnalysisItem[];
  emptyText: string;
  variant?: 'default' | 'gap' | 'warning';
}) {
  const headerColors = {
    default: 'text-zinc-400',
    gap: 'text-emerald-400',
    warning: 'text-amber-400',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${headerColors[variant]}`}>
          {title}
        </h3>
        <span className="text-xs text-zinc-600">{items.length} items</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600 py-2">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <AnalysisItemCard key={i} item={item} index={i} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function Analysis() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClientSupabase();
      const [{ data: sessions }, { data: analyses }] = await Promise.all([
        supabase
          .from('research_sessions')
          .select('*')
          .eq('status', 'done')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setSessions((sessions as ResearchSession[]) || []);
      const analysisData = (analyses as Analysis[]) || [];
      setAnalyses(analysisData);
      if (analysisData.length > 0) setSelectedAnalysis(analysisData[0]);
      setLoadingData(false);
    }
    load();
  }, []);

  async function handleRunAnalysis() {
    if (!selectedSessionId) return;
    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      const supabase = createClientSupabase();
      const { data: allAnalyses } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const updated = (allAnalyses as Analysis[]) || [];
      setAnalyses(updated);
      setSelectedAnalysis(updated[0] || null);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleTakeToStrategy() {
    if (selectedAnalysis) {
      router.push(`/strategy?analysisId=${selectedAnalysis.id}`);
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="panel-left p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Run Analysis
          </h2>

          <div className="space-y-3">
            <div>
              <label className="label-dark">Research Session</label>
              <select
                className="select-dark"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a completed session...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.niche} — {s.ad_count} ads
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={!selectedSessionId}
              onClick={handleRunAnalysis}
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </Button>

            {loading && (
              <p className="text-xs text-zinc-600 text-center">
                AI is extracting hooks, offers, and gaps...
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Saved Analyses
            </h2>
            <span className="text-xs text-zinc-600">{analyses.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loadingData ? (
              <p className="text-xs text-zinc-600 py-4 text-center">Loading...</p>
            ) : analyses.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center">No analyses yet</p>
            ) : (
              analyses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAnalysis(a)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedAnalysis?.id === a.id
                      ? 'bg-indigo-950 border border-indigo-800'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <p className="text-xs font-medium text-zinc-200 truncate mb-0.5">
                    {a.niche || 'Analysis'}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {a.hooks?.length || 0} hooks · {a.gaps?.length || 0} gaps
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="panel-right p-6">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="spinner w-8 h-8 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">Running Analysis</h3>
            <p className="text-xs text-zinc-600">
              Claude is extracting hooks, offers, angles, patterns, and gaps...
            </p>
          </div>
        ) : selectedAnalysis ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {selectedAnalysis.niche || 'Analysis Results'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {new Date(selectedAnalysis.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleTakeToStrategy}>
                Take to Strategy →
              </Button>
            </div>

            <div className="space-y-4">
              <SectionCard
                title="Hooks"
                items={selectedAnalysis.hooks || []}
                emptyText="No hooks extracted"
              />
              <SectionCard
                title="Offers & Value Props"
                items={selectedAnalysis.offers || []}
                emptyText="No offers extracted"
              />
              <SectionCard
                title="Messaging Angles"
                items={selectedAnalysis.angles || []}
                emptyText="No angles extracted"
              />
              <SectionCard
                title="Patterns"
                items={selectedAnalysis.patterns || []}
                emptyText="No patterns detected"
              />
              <SectionCard
                title="Saturated (Avoid)"
                items={selectedAnalysis.saturated || []}
                emptyText="Nothing flagged as saturated"
                variant="warning"
              />
              <SectionCard
                title="Market Gaps (Opportunities)"
                items={selectedAnalysis.gaps || []}
                emptyText="No gaps identified"
                variant="gap"
              />

              {/* Advertisers */}
              {selectedAnalysis.advertisers && selectedAnalysis.advertisers.length > 0 && (
                <Card title="Advertisers in Market">
                  <div className="space-y-2">
                    {(selectedAnalysis.advertisers as AdvertiserInfo[]).map((adv, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-zinc-800/40 rounded-lg border border-zinc-800"
                      >
                        <div>
                          <p className="text-sm text-zinc-200 font-medium">{adv.name}</p>
                          {adv.dominant_strategy && (
                            <p className="text-xs text-zinc-500 mt-0.5">{adv.dominant_strategy}</p>
                          )}
                        </div>
                        {adv.ad_count > 0 && (
                          <Badge variant="default" size="sm">
                            {adv.ad_count} ads
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-700" viewBox="0 0 24 24" fill="none">
                <path d="M3 12l5-5 4 4 5-6 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-1">No Analysis Selected</h3>
            <p className="text-xs text-zinc-600 max-w-xs">
              Select a completed research session and run analysis to extract hooks, offers, angles, and market gaps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
