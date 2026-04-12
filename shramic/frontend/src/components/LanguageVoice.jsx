// LanguageVoice.jsx — Voice components; language state lives in LangContext
export { LANGUAGES, useLang } from '../context/Langcontext.jsx'

import { useRef, useState } from 'react'
import { LANGUAGES, useLang } from '../context/Langcontext.jsx'

export function LanguageSwitcher() {
  const { lang, changeLang } = useLang()
  const [open, setOpen] = useState(false)
  const cur = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:border-green-400 transition-colors">
        <span>{cur.flag}</span><span className="font-medium text-gray-700">{cur.native}</span><span className="text-xs text-gray-400">▾</span>
      </button>
      {open && <>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 min-w-48 overflow-hidden">
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => { changeLang(l.code); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 ${lang===l.code?'bg-green-50 text-green-700 font-semibold':'text-gray-700'}`}>
              <span className="text-lg">{l.flag}</span>
              <div><div className="font-semibold">{l.native}</div><div className="text-xs text-gray-400">{l.label}</div></div>
              {lang===l.code && <span className="ml-auto text-green-600 text-sm">✓</span>}
            </button>
          ))}
        </div>
      </>}
    </div>
  )
}

export function VoiceInput({ onResult, placeholder = 'Click mic to speak' }) {
  const { lang } = useLang()
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const ref = useRef(null)
  const CODES = { en:'en-IN', hi:'hi-IN', kn:'kn-IN', te:'te-IN', ta:'ta-IN', mr:'mr-IN', gu:'gu-IN', pa:'pa-IN', bn:'bn-IN' }

  const start = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { setError('Use Chrome for voice input.'); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    ref.current = new SR()
    ref.current.lang = CODES[lang] || 'en-IN'
    ref.current.interimResults = true
    ref.current.onstart  = () => { setListening(true); setError('') }
    ref.current.onend    = () => setListening(false)
    ref.current.onerror  = e => { setError(`Error: ${e.error}`); setListening(false) }
    ref.current.onresult = e => {
      const txt = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(txt)
      if (e.results[e.results.length-1].isFinal) onResult?.(txt)
    }
    ref.current.start()
  }
  const stop = () => { ref.current?.stop(); setListening(false) }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input readOnly value={transcript} placeholder={listening ? '🎙 Listening…' : placeholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 cursor-default pr-10" />
          {transcript && <button onClick={() => { setTranscript(''); onResult?.('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>}
        </div>
        <button onMouseDown={start} onMouseUp={stop} onTouchStart={start} onTouchEnd={stop}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all ${listening?'bg-red-500 text-white animate-pulse':'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          🎙
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function speak(text, lang = 'en') {
  if (!window.speechSynthesis) return
  const CODES = { en:'en-IN', hi:'hi-IN', kn:'kn-IN', te:'te-IN', ta:'ta-IN', mr:'mr-IN', gu:'gu-IN', pa:'pa-IN' }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = CODES[lang] || 'en-IN'; u.rate = 0.9
  window.speechSynthesis.speak(u)
}

export function SpeakButton({ text }) {
  const { lang } = useLang()
  return <button onClick={() => speak(text, lang)} className="text-gray-400 hover:text-green-600 transition-colors text-sm" title="Read aloud">🔊</button>
}