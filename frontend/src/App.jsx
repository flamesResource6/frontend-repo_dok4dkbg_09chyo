import React, { useEffect, useMemo, useState } from 'react';
import Spline from '@splinetool/react-spline';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function Textarea({ label, value, onChange, rows = 8, placeholder }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-300">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
      />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-300">{label} <span className="text-slate-500">({min}–{max})</span></label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
      />
    </div>
  );
}

function Hero() {
  return (
    <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/4cHQr84zOGAHOehh/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950/90 pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 h-full flex flex-col items-center justify-end text-center pb-10">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-100">Music & Poetry Generator</h1>
        <p className="mt-4 text-slate-300 max-w-2xl">Feed lyrics or poems and create fresh sequences with a creative n-gram model. Tune order, temperature, and length to sculpt the vibe.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [raw, setRaw] = useState('You are the sunlight in my room,\nA quiet bloom at afternoon.');
  const [title, setTitle] = useState('Starter Corpus');
  const [type, setType] = useState('lyrics');
  const [length, setLength] = useState(240);
  const [temperature, setTemperature] = useState(0.9);
  const [order, setOrder] = useState(3);
  const [seed, setSeed] = useState('');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    fetch(`${BACKEND}/corpus`).then(r => r.json()).then(setLibrary).catch(() => {});
  }, []);

  async function saveCorpus() {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/corpus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, content: raw })
      });
      const data = await res.json();
      setSavedId(data.id);
      setLibrary((prev) => [data, ...prev]);
    } finally {
      setLoading(false);
    }
  }

  async function generate(from = 'raw') {
    setLoading(true);
    setGenerated('');
    try {
      const payload = {
        length, temperature, order, seed: seed || null,
      };
      if (from === 'saved' && savedId) payload.corpus_id = savedId;
      else payload.raw_text = raw;

      const res = await fetch(`${BACKEND}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setGenerated(data.result || '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Hero />

      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
              >
                <option value="lyrics">lyrics</option>
                <option value="poem">poem</option>
                <option value="generic">generic</option>
              </select>
            </div>
          </div>

          <Textarea
            label="Training Text"
            value={raw}
            onChange={setRaw}
            rows={10}
            placeholder="Paste lyrics or poems here..."
          />

          <div className="grid grid-cols-3 gap-4">
            <NumberField label="Length" value={length} onChange={setLength} min={32} max={2000} step={16} />
            <NumberField label="Temperature" value={temperature} onChange={setTemperature} min={0.1} max={2.5} step={0.1} />
            <NumberField label="Order" value={order} onChange={setOrder} min={1} max={8} step={1} />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Seed (optional)</label>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Starting words..."
              className="w-full rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button onClick={() => generate('raw')} disabled={loading} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60">Generate</button>
            <button onClick={saveCorpus} disabled={loading} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60">Save to Library</button>
            <button onClick={() => generate('saved')} disabled={!savedId || loading} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60">Generate from Saved</button>
            {savedId && <span className="text-sm text-slate-400">Saved ✓</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Output</h3>
              {loading && <span className="text-sm text-slate-400">Thinking…</span>}
            </div>
            <pre className="min-h-[320px] whitespace-pre-wrap rounded-xl bg-slate-900/60 border border-slate-700/60 p-4 text-slate-200">{generated}</pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Library</h3>
            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {library.map((c) => (
                <button key={c.id} onClick={() => setSavedId(c.id)} className={`w-full text-left px-3 py-2 rounded-lg border ${savedId===c.id? 'border-violet-500 bg-violet-500/10': 'border-slate-700/60 bg-slate-900/60'} hover:border-violet-500/60`}>
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-slate-400">{c.type} • {new Date(c.created_at).toLocaleString()}</div>
                </button>
              ))}
              {!library.length && <div className="text-sm text-slate-500">No saved corpus yet. Save one to start a reusable library.</div>}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center text-slate-500 pb-10">Built with a creative n-gram engine. Paste text and vibe.</footer>
    </div>
  );
}
