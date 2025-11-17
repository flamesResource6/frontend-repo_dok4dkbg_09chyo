import { useEffect, useMemo, useState } from 'react'
import Spline from '@splinetool/react-spline'

function Label({ children }) {
  return <label className="text-sm font-medium text-gray-700">{children}</label>
}

function NumberInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function TextArea({ value, onChange, rows = 8, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function Button({ children, onClick, disabled, variant = 'primary' }) {
  const cls =
    variant === 'secondary'
      ? 'bg-gray-600 hover:bg-gray-700'
      : variant === 'ghost'
      ? 'bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300'
      : 'bg-blue-600 hover:bg-blue-700'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${cls}`}
    >
      {children}
    </button>
  )
}

export default function App() {
  const backendBase = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])

  // Inputs
  const [title, setTitle] = useState('My Corpus')
  const [text, setText] = useState('Paste lyrics or poems here...')
  const [length, setLength] = useState(240)
  const [order, setOrder] = useState(3)
  const [temperature, setTemperature] = useState(1.0)
  const [seed, setSeed] = useState('')

  // Library
  const [library, setLibrary] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  // Output & status
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    loadLibrary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadLibrary = async () => {
    try {
      const res = await fetch(`${backendBase}/corpus`)
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setLibrary(data || [])
    } catch (e) {
      // DB might not be configured; keep library empty but show a hint
      setLibrary([])
      setNotice('Database not configured. You can still generate from raw text. Saving requires MongoDB.')
    }
  }

  const saveCorpus = async () => {
    if (!text || text.trim().length < order + 1) {
      setNotice('Please paste more text (longer than n-gram order).')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch(`${backendBase}/corpus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'Untitled', text }),
      })
      if (!res.ok) {
        const err = await safeJson(res)
        throw new Error(err?.detail || 'Save failed')
      }
      await loadLibrary()
      setNotice('Saved to library.')
    } catch (e) {
      setNotice(`Save failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const safeJson = async (res) => {
    try { return await res.json() } catch { return null }
  }

  const generateFromText = async () => {
    if (!text || text.trim().length < order + 1) {
      setNotice('Please paste more text (longer than n-gram order).')
      return
    }
    setBusy(true)
    setOutput('')
    setNotice('Generating...')
    try {
      const res = await fetch(`${backendBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, length, order, temperature, seed: seed || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Generation failed')
      setOutput(data.output)
      setNotice('Done')
    } catch (e) {
      setNotice(`Generation failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const generateFromSelected = async () => {
    if (!selectedId) {
      setNotice('Pick a saved corpus from your library first.')
      return
    }
    setBusy(true)
    setOutput('')
    setNotice('Generating...')
    try {
      const res = await fetch(`${backendBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpus_id: selectedId, length, order, temperature, seed: seed || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Generation failed')
      setOutput(data.output)
      setNotice('Done')
    } catch (e) {
      setNotice(`Generation failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-70 pointer-events-none hidden md:block">
          <Spline scene="https://prod.spline.design/4cHQr84zOGAHOehh/scene.splinecode" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">Creative Music & Poetry Generator</h1>
          <p className="mt-3 max-w-2xl text-gray-600">Paste your favorite lyrics or poems and generate new sequences using a character-level n-gram model. Save corpora to your library and reuse them anytime.</p>
          <div className="mt-6 flex gap-3">
            <a href="/test" className="text-sm text-blue-700 hover:underline">Connection Test</a>
            <span className="text-sm text-gray-400">Backend: {backendBase}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        {notice && (
          <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">{notice}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Input and params */}
          <section className="lg:col-span-2">
            <div className="space-y-4">
              <Label>Corpus Title</Label>
              <TextInput value={title} onChange={setTitle} placeholder="e.g. Shakespeare Mix" />

              <Label>Source Text</Label>
              <TextArea value={text} onChange={setText} rows={12} placeholder="Paste text here" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Length</Label>
                  <NumberInput value={length} onChange={setLength} min={50} max={2000} step={10} />
                </div>
                <div>
                  <Label>Order</Label>
                  <NumberInput value={order} onChange={setOrder} min={1} max={10} />
                </div>
                <div>
                  <Label>Temperature</Label>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.05}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-600">{temperature.toFixed(2)}</div>
                </div>
                <div>
                  <Label>Seed (optional)</Label>
                  <TextInput value={seed} onChange={setSeed} placeholder="Starting phrase" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={generateFromText} disabled={busy}>Generate from Text</Button>
                <Button onClick={saveCorpus} disabled={busy} variant="secondary">Save to Library</Button>
              </div>
            </div>
          </section>

          {/* Right: Library */}
          <aside className="lg:col-span-1">
            <div className="rounded-lg border bg-white/70 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">Library</h3>
                <Button variant="ghost" onClick={loadLibrary} disabled={busy}>Refresh</Button>
              </div>
              {library.length === 0 ? (
                <p className="text-sm text-gray-600">No saved corpora yet.</p>
              ) : (
                <ul className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {library.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${selectedId === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="font-medium text-gray-800">{c.title}</div>
                        <div className="text-xs text-gray-500">{c.id}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <Button onClick={generateFromSelected} disabled={busy || !selectedId}>Generate from Selected</Button>
              </div>
            </div>
          </aside>
        </div>

        {/* Output */}
        <section className="mt-10">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Output</h3>
          <pre className="whitespace-pre-wrap rounded-lg border bg-white/80 backdrop-blur p-4 text-sm text-gray-900 min-h-[160px]">{output || 'No output yet.'}</pre>
        </section>
      </main>

      <footer className="border-t bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-gray-600 flex items-center justify-between">
          <span>Built with a character-level n-gram model</span>
          <a href="/test" className="text-blue-700 hover:underline">Run connection test</a>
        </div>
      </footer>
    </div>
  )
}
