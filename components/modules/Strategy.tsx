'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Analysis, Strategy, StrategyAngle, PositioningItem, CampaignConcept } from '@/types';

const FOCUS_OPTIONS = [
  'Differentiation from competitors',
  'Untapped audience segments',
  'Emotional resonance',
  'Price/value positioning',
  'Social proof & trust',
  'Problem agitation',
  'Aspirational lifestyle',
  'Urgency & scarcity',
];

export function StrategyModule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAnalysisId = searchParams.get('analysisId');

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(preselectedAnalysisId || '');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const [niche, setNiche] = useState('');
  const [audience, setAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [goal, setGoal] = useState('');
  const [focus, setFocus] = useState(FOCUS_OPTIONS[0]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClientSupabase();
      const [{ data: analysisData }, { data: strategyData }] = await Promise.all([
        supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('strategies')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
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
    if (!niche || !audience || !offer || !goal) return;
    setLoading(true);

    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: selectedAnalysisId,
          niche,
          audience,
          offer,
          goal,
          focus,
        }),
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
      setSelectedStrategy(updated[0] || null);
    } catch (err) {
      console.error('Strategy error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleTakeToCreative() {
    if (selectedStrategy) {
      router.push(
        `/creative?strategyId=${selectedStrategy.id}&niche=${encodeURIComponent(selectedStrategy.niche || '')}`
      );
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="panel-left p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Build Strategy
          </h2>

          <div className="space-y-3">
            <div>
              <label className="label-dark">Analysis (Optional)</label>
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
                <option value="">No analysis (manual inputs only)</option>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.niche || 'Analysis'} — {new Date(a.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-dark">Niche</label>
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
              <label className="label-dark">Target Audience</label>
              <textarea
                className="textarea-dark"
                placeholder="e.g. Women 25-45 who want to lose 15-30 lbs before summer"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            <div>
              <label className="label-dark">Offer</label>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g. $49 starter kit + 30-day guarantee"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="label-dark">Campaign Goal</label>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g. Lead generation, cold traffic sales"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="label-dark">Strategic Focus</label>
              <select
                className="select-dark"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                disabled={loading}
              >
                {FOCUS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={!niche || !audience || !offer || !goal}
              onClick={handleRunStrategy}
            >
              {loading ? 'Building Strategy...' : 'Run Strategy'}
            </Button>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Saved Strategies
            </h2>
            <span className="text-xs text-zinc-600">{strategies.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loadingData ? (
              <p className="text-xs text-zinc-600 py-4 text-center">Loading...</p>
            ) : strategies.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center">No strategies yet</p>
            ) : (
              strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStrategy(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedStrategy?.id === s.id
                      ? 'bg-indigo-950 border border-indigo-800'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <p className="text-xs font-medium text-zinc-200 truncate mb-0.5">
                    {s.niche || 'Strategy'}
                  </p>
                  <p className="text-xs text-zinc-600 truncate">
                    {s.audience || 'No audience specified'}
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
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">Building Strategy</h3>
            <p className="text-xs text-zinc-600">
              Generating angles, positioning, and campaign concepts...
            </p>
          </div>
        ) : selectedStrategy ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {selectedStrategy.niche || 'Strategy'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedStrategy.audience} · {selectedStrategy.goal}
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleTakeToCreative}>
                Take to Creative →
              </Button>
            </div>

            <div className="space-y-5">
              {/* Offer Angles */}
              <Card title="Offer Angles" subtitle="Differentiated positioning opportunities">
                <div className="space-y-2 mt-3">
                  {(selectedStrategy.offer_angles as StrategyAngle[])?.map((a, i) => (
                    <div
                      key={i}
                      className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-800"
                    >
                      <p className="text-sm font-medium text-zinc-200 mb-1">{a.angle}</p>
                      <p className="text-xs text-zinc-500 mb-1">{a.rationale}</p>
                      {a.example && (
                        <p className="text-xs text-indigo-400 italic">"{a.example}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Positioning */}
              <Card title="Positioning Statements">
                <div className="space-y-2 mt-3">
                  {(selectedStrategy.positioning as PositioningItem[])?.map((p, i) => (
                    <div key={i} className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
                      <p className="text-sm text-zinc-200 mb-1">{p.statement}</p>
                      <p className="text-xs text-zinc-500">
                        <span className="text-zinc-600">Differentiator:</span> {p.differentiator}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Campaign Concepts */}
              <Card title="Campaign Concepts" subtitle="Ready-to-execute campaign ideas">
                <div className="space-y-3 mt-3">
                  {(selectedStrategy.campaign_concepts as CampaignConcept[])?.map((c, i) => (
                    <div key={i} className="p-4 bg-zinc-800/40 rounded-lg border border-zinc-800">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-zinc-100">{c.name}</p>
                        <Badge variant="indigo" size="sm">{c.format}</Badge>
                      </div>
                      <p className="text-xs text-indigo-300 italic mb-2">"{c.hook}"</p>
                      <p className="text-xs text-zinc-400 mb-1">{c.key_message}</p>
                      <p className="text-xs text-zinc-600">
                        <span className="text-zinc-500">Audience:</span> {c.audience_segment}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Messaging Priorities */}
              <div className="grid grid-cols-2 gap-4">
                <Card title="Messaging Priorities">
                  <ol className="space-y-1.5 mt-3">
                    {selectedStrategy.messaging_priorities?.map((p, i) => (
                      <li key={i} className="flex gap-2 text-xs text-zinc-400">
                        <span className="text-zinc-600 font-mono w-4 shrink-0">{i + 1}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </Card>

                <Card title="Avoid">
                  <ul className="space-y-1.5 mt-3">
                    {selectedStrategy.avoid?.map((a, i) => (
                      <li key={i} className="flex gap-2 text-xs text-zinc-400">
                        <span className="text-red-600 shrink-0">✕</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-700" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l9 5.5v7L12 21l-9-5.5v-7L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-1">No Strategy Selected</h3>
            <p className="text-xs text-zinc-600 max-w-xs">
              Fill in your niche, audience, offer, and goal to generate a differentiated advertising strategy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
