'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Analysis, Strategy, AngleCluster, CampaignDirection, TestingHypothesis } from '@/types';

const SATURATION_BADGE: Record<string, 'green' | 'amber' | 'red'> = {
  low:    'green',
  medium: 'amber',
  high:   'red',
};

const PRIORITY_BADGE: Record<string, 'green' | 'amber' | 'default'> = {
  high:   'green',
  medium: 'amber',
  low:    'default',
};

export function StrategyModule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAnalysisId = searchParams.get('analysisId');

  const [analyses,         setAnalyses]         = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(preselectedAnalysisId || '');
  const [strategies,       setStrategies]       = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const [niche,    setNiche]    = useState('');
  const [audience, setAudience] = useState('');
  const [offer,    setOffer]    = useState('');
  const [goal,     setGoal]     = useState('');

  const [loading,     setLoading]     = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClientSupabase();
      const [{ data: analysisData }, { data: strategyData }] = await Promise.all([
        supabase.from('analyses').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('strategies').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      const analysisArr = (analysisData as Analysis[]) || [];
      setAnalyses(analysisArr);
      setStrategies((strategyData as Strategy[]) || []);

      if (preselectedAnalysisId) {
        setSelectedAnalysisId(preselectedAnalysisId);
        const preselected = analysisArr.find((a) => a.id === preselectedAnalysisId);
        if (preselected?.niche) setNiche(preselected.niche);
      }

      setLoadingData(false);
    }
    load();
  }, [preselectedAnalysisId]);

  async function handleRunStrategy() {
    if (!selectedAnalysisId) { setError('Select an analysis to feed the Strategy Brain.'); return; }
    if (!niche || !audience || !offer || !goal) { setError('All fields are required.'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: selectedAnalysisId, niche, audience, offer, goal }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Strategy failed');

      const supabase = createClientSupabase();
      const { data: allStrategies } = await supabase
        .from('strategies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const updated = (allStrategies as Strategy[]) || [];
      setStrategies(updated);
      setSelectedStrategy(data as Strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleTakeToCreative() {
    if (selectedStrategy) {
      router.push(`/creative?strategyId=${selectedStrategy.id}&niche=${encodeURIComponent(selectedStrategy.niche || '')}`);
    }
  }

  return (
    <div className="flex h-full">
      {/* ── Left Panel ─────────────────────────────────────────────── */}
      <div className="panel-left p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Strategy Brain
          </h2>

          <div className="space-y-3">
            {/* Analysis selector — required */}
            <div>
              <label className="label-dark">
                Analysis <span className="text-red-500">*</span>
              </label>
              <select
                className="select-dark"
                value={selectedAnalysisId}
                onChange={(e) => {
                  setSelectedAnalysisId(e.target.value);
                  const a = analyses.find((x) => x.id === e.target.value);
                  if (a?.niche) setNiche(a.niche);
                }}
                disabled={loading}
              >
                <option value="">— select analysis —</option>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.niche || 'Analysis'} · {new Date(a.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-600 mt-1">Strategy Brain requires competitive data from analysis</p>
            </div>

            <div>
              <label className="label-dark">Niche</label>
              <input type="text" className="input-dark" placeholder="e.g. Weight Loss Supplements"
                value={niche} onChange={(e) => setNiche(e.target.value)} disabled={loading} />
            </div>

            <div>
              <label className="label-dark">Target Audience</label>
              <textarea className="textarea-dark" rows={2}
                placeholder="e.g. Women 25-45 who want to lose 15-30 lbs before summer"
                value={audience} onChange={(e) => setAudience(e.target.value)} disabled={loading} />
            </div>

            <div>
              <label className="label-dark">Current Offer</label>
              <input type="text" className="input-dark" placeholder="e.g. $49 starter kit + 30-day guarantee"
                value={offer} onChange={(e) => setOffer(e.target.value)} disabled={loading} />
            </div>

            <div>
              <label className="label-dark">Campaign Goal</label>
              <input type="text" className="input-dark" placeholder="e.g. Cold traffic sales, lead generation"
                value={goal} onChange={(e) => setGoal(e.target.value)} disabled={loading} />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-950/40 px-3 py-2 rounded-lg">{error}</p>}

            <Button variant="primary" className="w-full" loading={loading}
              disabled={!niche || !audience || !offer || !goal || !selectedAnalysisId}
              onClick={handleRunStrategy}>
              {loading ? 'Running Strategy Brain...' : 'Run Strategy Brain'}
            </Button>
          </div>
        </div>

        {/* Saved strategies */}
        <div className="border-t border-zinc-800 pt-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Saved</h2>
            <span className="text-xs text-zinc-600">{strategies.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {loadingData ? (
              <p className="text-xs text-zinc-600 py-4 text-center">Loading...</p>
            ) : strategies.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center">No strategies yet</p>
            ) : (
              strategies.map((s) => (
                <button key={s.id} onClick={() => setSelectedStrategy(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedStrategy?.id === s.id
                      ? 'bg-indigo-950 border border-indigo-800'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}>
                  <p className="text-xs font-medium text-zinc-200 truncate mb-0.5">{s.niche || 'Strategy'}</p>
                  <p className="text-xs text-zinc-600 truncate">{s.goal || 'No goal specified'}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────── */}
      <div className="panel-right p-6">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="spinner w-8 h-8 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">Strategy Brain Running</h3>
            <p className="text-xs text-zinc-600">Analyzing competitive position and building strategy...</p>
          </div>
        ) : selectedStrategy ? (
          <StrategyOutput strategy={selectedStrategy} onTakeToCreative={handleTakeToCreative} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-700" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l9 5.5v7L12 21l-9-5.5v-7L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-1">Strategy Brain</h3>
            <p className="text-xs text-zinc-600 max-w-xs">
              Select an analysis, fill in your brand context, and run the Strategy Brain to get angle clusters, campaign directions, and a testing plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Strategy Output Component ────────────────────────────────────────────────

function StrategyOutput({ strategy, onTakeToCreative }: { strategy: Strategy; onTakeToCreative: () => void }) {
  const angleClusters    = (strategy.angle_clusters      || []) as AngleCluster[];
  const recommended      = (strategy.recommended_angles  || []) as string[];
  const campaignDirs     = (strategy.campaign_directions || []) as CampaignDirection[];
  const testingPlan      = (strategy.testing_plan        || []) as TestingHypothesis[];
  const insights         = (strategy.strategic_insights  || []) as string[];

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{strategy.niche}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {strategy.audience} · Goal: {strategy.goal}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={onTakeToCreative}>
          Take to Creative →
        </Button>
      </div>

      {/* Recommended angles — top priority, shown first */}
      {recommended.length > 0 && (
        <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-xl">
          <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
            ✦ Recommended: Test These First
          </h3>
          <ol className="space-y-1.5">
            {recommended.map((angle, i) => (
              <li key={i} className="flex gap-2 text-xs text-zinc-300">
                <span className="text-indigo-500 font-mono shrink-0 w-4">{i + 1}.</span>
                <span>{angle}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Angle Clusters */}
      {angleClusters.length > 0 && (
        <Card title="Angle Clusters" subtitle="Distinct positioning opportunities with saturation signals">
          <div className="space-y-2 mt-3">
            {angleClusters.map((c, i) => (
              <div key={i} className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-zinc-100">{c.angle}</p>
                  <Badge variant={SATURATION_BADGE[c.market_saturation] || 'zinc'} size="sm">
                    {c.market_saturation} saturation
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 mb-1">{c.description}</p>
                <p className="text-xs text-zinc-600">
                  <span className="text-zinc-500">Why it works:</span> {c.why_it_works}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Campaign Directions */}
      {campaignDirs.length > 0 && (
        <Card title="Campaign Directions" subtitle="Ready-to-brief concepts with opening hooks">
          <div className="space-y-3 mt-3">
            {campaignDirs.map((d, i) => (
              <div key={i} className="p-4 bg-zinc-800/40 rounded-lg border border-zinc-800">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-zinc-100">{d.name}</p>
                  <div className="flex gap-1.5">
                    <Badge variant={PRIORITY_BADGE[d.priority] || 'zinc'} size="sm">{d.priority}</Badge>
                    <Badge variant="indigo" size="sm">{d.format}</Badge>
                  </div>
                </div>
                <p className="text-xs text-indigo-300 italic mb-2">"{d.hook}"</p>
                <p className="text-xs text-zinc-500">
                  <span className="text-zinc-400">Angle:</span> {d.angle}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  <span className="text-zinc-500">Audience:</span> {d.audience_segment}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Testing Plan + Insights */}
      <div className="grid grid-cols-2 gap-4">
        {testingPlan.length > 0 && (
          <Card title="Testing Plan" subtitle="Hypotheses to validate">
            <div className="space-y-3 mt-3">
              {testingPlan.map((t, i) => (
                <div key={i} className="p-3 bg-zinc-800/30 rounded-lg">
                  <p className="text-xs font-medium text-zinc-300 mb-1">{t.test_type}</p>
                  <p className="text-xs text-zinc-500 mb-1">{t.hypothesis}</p>
                  <p className="text-xs text-zinc-600">
                    <span className="text-zinc-500">Expect:</span> {t.expected_outcome}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {insights.length > 0 && (
          <Card title="Strategic Insights" subtitle="Non-obvious observations">
            <ul className="space-y-2 mt-3">
              {insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-xs text-zinc-400">
                  <span className="text-amber-500 shrink-0 mt-0.5">→</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
