import { useEffect, useMemo, useRef, useState } from 'react'
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

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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
      ? 'bg-gray-700 hover:bg-gray-800 text-white'
      : variant === 'ghost'
      ? 'bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300'
      : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${cls}`}
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

  // Style controls
  const [genre, setGenre] = useState('pop')
  const [flow, setFlow] = useState('smooth')
  const [bpm, setBpm] = useState(100)
  const [mood, setMood] = useState('chill')
  const [voice, setVoice] = useState('female')
  const [language, setLanguage] = useState('en')
  const [slow, setSlow] = useState(false)

  // Library
  const [library, setLibrary] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  // Output & status
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  // Audio
  const [audioSrc, setAudioSrc] = useState('')
  const audioRef = useRef(null)

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

  const makeGenPayload = (extra = {}) => ({
    text,
    length,
    order,
    temperature,
    seed: seed || null,
    genre,
    flow,
    bpm,
    mood,
    voice,
    language,
    ...extra,
  })

  const generateFromText = async () => {
    if (!text || text.trim().length < order + 1) {
      setNotice('Please paste more text (longer than n-gram order).')
      return
    }
    setBusy(true)
    setAudioSrc('')
    setOutput('')
    setNotice('Generating...')
    try {
      const res = await fetch(`${backendBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeGenPayload()),
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
    setAudioSrc('')
    setOutput('')
    setNotice('Generating...')
    try {
      const res = await fetch(`${backendBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeGenPayload({ text: undefined, corpus_id: selectedId })),
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

  const ttsSpeak = async (txt) => {
    if (!txt || !txt.trim()) {
      setNotice('Nothing to speak. Generate text first.')
      return
    }
    setBusy(true)
    setNotice('Synthesizing voice...')
    try {
      const res = await fetch(`${backendBase}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txt, voice, language, slow }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'TTS failed')
      const src = `data:${data.mime_type};base64,${data.audio_base64}`
      setAudioSrc(src)
      setTimeout(() => {
        try { audioRef.current?.play() } catch {}
      }, 100)
      setNotice('Ready to play')
    } catch (e) {
      setNotice(`TTS failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const generateAndSing = async () => {
    await generateFromText()
    // slight delay to ensure state updated
    setTimeout(() => ttsSpeak(output || text), 200)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-cyan-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-70 pointer-events-none hidden md:block">
          <Spline scene="https://prod.spline.design/4cHQr84zOGAHOehh/scene.splinecode" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">Creative Music & Poetry Generator</h1>
              <p className="mt-3 max-w-2xl text-gray-600">Craft text with a character-level n-gram model, then turn it into voice. Tune genre, flow, BPM, and mood.</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/test" className="text-sm text-blue-700 hover:underline">Connection Test</a>
              <span className="hidden sm:inline text-sm text-gray-400">Backend: {backendBase}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {notice && (
          <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">{notice}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left: Input and params */}
          <section className="xl:col-span-2 space-y-6">
            <div className="rounded-xl border bg-white/80 backdrop-blur p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Corpus Title</Label>
                  <TextInput value={title} onChange={setTitle} placeholder="e.g. Shakespeare Mix" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order</Label>
                    <NumberInput value={order} onChange={setOrder} min={1} max={10} />
                  </div>
                  <div>
                    <Label>Length</Label>
                    <NumberInput value={length} onChange={setLength} min={50} max={2000} step={10} />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Label>Source Text</Label>
                <TextArea value={text} onChange={setText} rows={10} placeholder="Paste text here" />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                <div>
                  <Label>Genre</Label>
                  <Select value={genre} onChange={setGenre} options={[
                    { value: 'pop', label: 'Pop' },
                    { value: 'hiphop', label: 'Hip-hop' },
                    { value: 'jazz', label: 'Jazz' },
                    { value: 'rock', label: 'Rock' },
                    { value: 'lofi', label: 'Lo-fi' },
                  ]} />
                </div>
                <div>
                  <Label>Flow</Label>
                  <Select value={flow} onChange={setFlow} options={[
                    { value: 'smooth', label: 'Smooth' },
                    { value: 'rapid', label: 'Rapid' },
                    { value: 'story', label: 'Storytelling' },
                    { value: 'punchy', label: 'Punchy' },
                  ]} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label>BPM</Label>
                  <NumberInput value={bpm} onChange={setBpm} min={40} max={240} />
                </div>
                <div>
                  <Label>Mood</Label>
                  <Select value={mood} onChange={setMood} options={[
                    { value: 'chill', label: 'Chill' },
                    { value: 'happy', label: 'Happy' },
                    { value: 'sad', label: 'Moody' },
                    { value: 'epic', label: 'Epic' },
                  ]} />
                </div>
                <div>
                  <Label>Voice</Label>
                  <Select value={voice} onChange={setVoice} options={[
                    { value: 'female', label: 'Female' },
                    { value: 'male', label: 'Male' },
                  ]} />
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={language} onChange={setLanguage} options={[
                    { value: 'en', label: 'English' },
                    { value: 'en-uk', label: 'English (UK)' },
                    { value: 'en-au', label: 'English (AU)' },
                    { value: 'hi', label: 'Hindi' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' },
                    { value: 'ja', label: 'Japanese' },
                  ]} />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <input id="slow" type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
                <label htmlFor="slow" className="text-sm text-gray-700">Slow voice</label>
              </div>

              <div className="flex flex-wrap gap-3 pt-5">
                <Button onClick={generateFromText} disabled={busy}>Generate from Text</Button>
                <Button onClick={saveCorpus} disabled={busy} variant="secondary">Save to Library</Button>
                <Button onClick={generateAndSing} disabled={busy} variant="success">Generate & Sing</Button>
              </div>
            </div>

            <section className="rounded-xl border bg-white/80 backdrop-blur p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Output</h3>
              <pre className="whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm text-gray-900 min-h-[160px]">{output || 'No output yet.'}</pre>
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <Button onClick={() => ttsSpeak(output)} disabled={busy || !output}>Speak Output</Button>
                {audioSrc && (
                  <>
                    <audio ref={audioRef} controls src={audioSrc} className="h-10" />
                    <a download="song.mp3" href={audioSrc} className="text-sm text-blue-700 hover:underline">Download audio</a>
                  </>
                )}
              </div>
            </section>
          </section>

          {/* Right: Library */}
          <aside className="xl:col-span-1">
            <div className="rounded-xl border bg-white/80 backdrop-blur p-4 shadow-sm sticky top-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">Library</h3>
                <Button variant="ghost" onClick={loadLibrary} disabled={busy}>Refresh</Button>
              </div>
              {library.length === 0 ? (
                <p className="text-sm text-gray-600">No saved corpora yet.</p>
              ) : (
                <ul className="space-y-2 max-h-[460px] overflow-auto pr-1">
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
              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={generateFromSelected} disabled={busy || !selectedId}>Generate from Selected</Button>
                <Button onClick={() => generateFromSelected().then(() => ttsSpeak(output))} disabled={busy || !selectedId} variant="success">Generate & Sing from Selected</Button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-gray-600 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <span>Built with a character-level n-gram model + gTTS voice</span>
          <a href="/test" className="text-blue-700 hover:underline">Run connection test</a>
        </div>
      </footer>
    </div>
  )
}
