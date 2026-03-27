'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Strategy, Creative, CreativeType } from '@/types';

const TONE_OPTIONS = [
  'Conversational & direct',
  'Bold & confident',
  'Empathetic & warm',
  'Authoritative & credible',
  'Playful & energetic',
  'Urgency-driven',
  'Minimalist & premium',
  'Story-driven',
];

const TABS: { key: CreativeType; label: string }[] = [
  { key: 'copy', label: 'Ad Copy' },
  { key: 'brief', label: 'Creative Brief' },
  { key: 'image_prompts', label: 'Image Prompts' },
];

function formatMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('# ')) {
      return <h2 key={i} className="text-base font-semibold text-zinc-100 mt-5 mb-2">{line.slice(2)}</h2>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-sm font-semibold text-zinc-200 mt-4 mb-1.5">{line.slice(3)}</h3>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={i} className="text-xs font-semibold text-zinc-300 uppercase tracking-wide mt-3 mb-1">{line.slice(4)}</h4>;
    }
    if (line.startsWith('---')) {
      return <hr key={i} className="border-zinc-800 my-4" />;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-2 mb-1">
          <span className="text-zinc-600 shrink-0 mt-0.5">·</span>
          <span className="text-sm text-zinc-400">{line.slice(2)}</span>
        </div>
      );
    }
    if (/^\d+\. /.test(line)) {
      const [num, ...rest] = line.split('. ');
      return (
        <div key={i} className="flex gap-2 mb-1">
          <span className="text-zinc-600 font-mono text-xs w-5 shrink-0 mt-0.5">{num}.</span>
          <span className="text-sm text-zinc-400">{rest.join('. ')}</span>
        </div>
      );
    }
    if (line.trim() === '') {
      return <div key={i} className="h-1" />;
    }
    if (line.startsWith('VARIATION') || line.startsWith('PROMPT') || line.startsWith('HOOK:') || line.startsWith('BODY:') || line.startsWith('CTA:') || line.startsWith('USE FOR:') || line.startsWith('ASPECT RATIO:')) {
      return <p key={i} className="text-xs font-semibold text-indigo-400 mt-2 mb-0.5">{line}</p>;
    }
    return <p key={i} className="text-sm text-zinc-400 mb-1 leading-relaxed">{line}</p>;
  });
}

export function CreativeModule() {
  const searchParams = useSearchParams();
  const preselectedStrategyId = searchParams.get('strategyId');
  const preselectedNiche = searchParams.get('niche');

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState(preselectedStrategyId || '');
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);

  const [niche, setNiche] = useState(preselectedNiche || '');
  const [audience, setAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [tone, setTone] = useState(TONE_OPTIONS[0]);
  const [activeTab, setActiveTab] = useState<CreativeType>('copy');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClientSupabase();
      const [{ data: strategyData }, { data: creativeData }] = await Promise.all([
        supabase
          .from('strategies')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('creatives')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const stratArr = (strategyData as Strategy[]) || [];
      setStrategies(stratArr);
      setCreatives((creativeData as Creative[]) || []);

      if (preselectedStrategyId) {
        const pre = stratArr.find((s) => s.id === preselectedStrategyId);
        if (pre) {
          if (pre.niche && !preselectedNiche) setNiche(pre.niche);
          if (pre.audience) setAudience(pre.audience);
          if (pre.offer) setOffer(pre.offer);
        }
      }

      setLoadingData(false);
    }
    load();
  }, [preselectedStrategyId, preselectedNiche]);

  async function handleGenerate() {
    if (!niche || !audience || !offer) return;
    setLoading(true);
    setOutput('');

    try {
      const res = await fetch('/api/creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: selectedStrategyId || undefined,
          niche,
          audience,
          offer,
          tone,
          type: activeTab,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Creative generation failed');

      setOutput(data.content || '');

      const supabase = createClientSupabase();
      const { data: allCreatives } = await supabase
        .from('creatives')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      setCreatives((allCreatives as Creative[]) || []);
    } catch (err) {
      console.error('Creative error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const text = selectedCreative ? selectedCreative.content : output;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleExport() {
    const text = selectedCreative ? selectedCreative.content : output;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creative-${activeTab}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const displayContent = selectedCreative ? selectedCreative.content : output;
  const displayType = selectedCreative ? selectedCreative.type : activeTab;

  const filteredCreatives = creatives.filter((c) => c.type === activeTab);

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="panel-left p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Generate Creative
          </h2>

          <div className="space-y-3">
            <div>
              <label className="label-dark">Strategy (Optional)</label>
              <select
                className="select-dark"
                value={selectedStrategyId}
                onChange={(e) => {
                  setSelectedStrategyId(e.target.value);
                  const s = strategies.find((x) => x.id === e.target.value);
                  if (s) {
                    if (s.niche) setNiche(s.niche);
                    if (s.audience) setAudience(s.audience);
                    if (s.offer) setOffer(s.offer);
                  }
                }}
                disabled={loading}
              >
                <option value="">No strategy (manual inputs)</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.niche || 'Strategy'} — {new Date(s.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-dark">Niche</label>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g. Weight Loss"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="label-dark">Target Audience</label>
              <textarea
                className="textarea-dark"
                placeholder="Who is this for?"
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
                placeholder="What are you selling/promoting?"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="label-dark">Tone</label>
              <select
                className="select-dark"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={loading}
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Saved Creatives by type */}
        <div className="border-t border-zinc-800 pt-4 flex-1 min-h-0 flex flex-col">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Saved ({activeTab})
          </h2>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loadingData ? (
              <p className="text-xs text-zinc-600 py-4 text-center">Loading...</p>
            ) : filteredCreatives.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center">
                No {activeTab} creatives yet
              </p>
            ) : (
              filteredCreatives.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCreative(c);
                    setOutput('');
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedCreative?.id === c.id
                      ? 'bg-indigo-950 border border-indigo-800'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <p className="text-xs font-medium text-zinc-200 truncate mb-0.5">
                    {c.niche || 'Creative'}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="panel-right flex flex-col">
        {/* Tabs + Actions */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedCreative(null);
                  setOutput('');
                }}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {displayContent && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export
                </Button>
              </>
            )}
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              disabled={!niche || !audience || !offer}
              onClick={handleGenerate}
            >
              {loading ? 'Generating...' : `Generate ${TABS.find((t) => t.key === activeTab)?.label}`}
            </Button>
          </div>
        </div>

        {/* Output Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="spinner w-8 h-8 mb-4" />
              <h3 className="text-sm font-semibold text-zinc-300 mb-1">Generating Creative</h3>
              <p className="text-xs text-zinc-600">
                Claude is writing your {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}...
              </p>
            </div>
          ) : displayContent ? (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant={
                    displayType === 'copy'
                      ? 'indigo'
                      : displayType === 'brief'
                      ? 'purple'
                      : 'green'
                  }
                  size="sm"
                >
                  {displayType === 'copy' ? 'Ad Copy' : displayType === 'brief' ? 'Brief' : 'Image Prompts'}
                </Badge>
                {selectedCreative && (
                  <span className="text-xs text-zinc-600">
                    {new Date(selectedCreative.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="prose-dark">{formatMarkdown(displayContent)}</div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-zinc-700" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17l4-4 4 4 4-8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 7h18M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-1">Ready to Generate</h3>
              <p className="text-xs text-zinc-600 max-w-xs">
                Fill in niche, audience, and offer then click generate. Select a saved creative from the left panel to review past work.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
