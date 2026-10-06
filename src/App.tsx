import { useEffect, useState } from 'react'
import './App.css'
import { clearSavedCard, readSavedCard, writeSavedCard, type SavedCard } from './storage'

type Mission = { title: string; question: string; steps: string[]; duration: number; promptVersion: number; source: string }
type Card = SavedCard<Mission>
type Language = 'pt' | 'en'

const words = {
  pt: { brand: 'Lá Fora', eyebrow: 'UMA PAUSA PARA REPARAR', lead: 'O que existe\nperto de você?', intro: 'Uma pequena missão de observação para sair do piloto automático, sem ir longe e sem precisar conhecer nada.', duration: 'Seu tempo', place: 'Onde você está?', movement: 'Seu ritmo', focus: 'Repare em', context: 'Um detalhe do lugar (opcional)', contextHint: 'Até 200 caracteres. Não inclua endereço.', generate: 'Criar minha missão', minutes: 'minutos', still: 'Ficar por perto', walk: 'Dar uma volta', places: { porch: 'Varanda', yard: 'Quintal', park: 'Praça conhecida' }, focuses: { shapes: 'Formas', sounds: 'Sons', light: 'Luz e sombra' }, loading: 'Preparando sua missão…', error: 'Não foi possível criar uma missão agora.', retry: 'Tentar de novo', mission: 'SUA MISSÃO', save: 'Guardar para depois', back: 'Voltar', return: 'O que você descobriu?', note: 'Escreva o que percebeu. Pode ser uma coisa pequena.', placeholders: ['Uma coisa que eu não tinha reparado…', 'Um som, forma ou detalhe…', 'O que me surpreendeu…'], finish: 'Guardar minhas descobertas', clear: 'Apagar cartão', copy: 'Copiar cartão', copied: 'Cartão copiado', saved: 'Missão guardada neste dispositivo', safety: 'Fique em um lugar familiar e permitido. Não toque, recolha ou alimente animais. Se algo parecer inseguro, volte.', empty: 'Nenhuma missão guardada ainda.', generatingOffline: 'Para criar uma missão nova, conecte-se à internet.', language: 'EN', returnButton: 'Voltei da pausa', change: 'Escolher outra missão' },
  en: { brand: 'Out There', eyebrow: 'A MOMENT TO NOTICE', lead: 'What is here\naround you?', intro: 'A small observation mission to step out of autopilot, without going far or needing to know anything in advance.', duration: 'Your time', place: 'Where are you?', movement: 'Your pace', focus: 'Notice', context: 'A detail about this place (optional)', contextHint: 'Up to 200 characters. No address, please.', generate: 'Make my mission', minutes: 'minutes', still: 'Stay nearby', walk: 'Take a short walk', places: { porch: 'Porch', yard: 'Yard', park: 'Familiar park' }, focuses: { shapes: 'Shapes', sounds: 'Sounds', light: 'Light & shade' }, loading: 'Making your mission…', error: 'Could not make a mission right now.', retry: 'Try again', mission: 'YOUR MISSION', save: 'Save for later', back: 'Back', return: 'What did you notice?', note: 'Write down what you noticed. It can be something small.', placeholders: ['One thing I had not noticed…', 'A sound, shape or detail…', 'What surprised me…'], finish: 'Save my discoveries', clear: 'Clear card', copy: 'Copy card', copied: 'Card copied', saved: 'Mission saved on this device', safety: 'Stay somewhere familiar and permitted. Do not touch, collect or feed wildlife. If anything feels unsafe, head back.', empty: 'No saved mission yet.', generatingOffline: 'Connect to the internet to make a new mission.', language: 'PT', returnButton: 'I am back', change: 'Choose another mission' },
} as const

function readCard(): Card | null {
  const candidate = readSavedCard<Mission>()
  if (!candidate || typeof candidate.mission?.title !== 'string' || typeof candidate.mission.question !== 'string' || !Array.isArray(candidate.mission.steps) || candidate.mission.steps.length !== 3) return null
  return candidate
}

function App() {
  const [language, setLanguage] = useState<Language>('pt')
  const t = words[language]
  const [duration, setDuration] = useState(10)
  const [environment, setEnvironment] = useState<'porch' | 'yard' | 'park'>('porch')
  const [movement, setMovement] = useState<'still' | 'walk'>('still')
  const [focus, setFocus] = useState<'shapes' | 'sounds' | 'light'>('sounds')
  const [context, setContext] = useState('')
  const [card, setCard] = useState<Card | null>(() => readCard())
  const [view, setView] = useState<'prepare' | 'mission' | 'return'>(() => readCard() ? 'mission' : 'prepare')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [storageUnavailable, setStorageUnavailable] = useState(false)

  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en'
  }, [language])

  async function createMission() {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ duration, environment, movement, focus, context, language }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t.error)
      const next = { mission: result as Mission, notes: ['', '', ''] as [string, string, string] }
      setStorageUnavailable(!writeSavedCard(next))
      setCard(next); setView('mission')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error)
    } finally { setBusy(false) }
  }

  function updateNote(index: number, value: string) {
    if (!card) return
    const notes = [...card.notes] as [string, string, string]; notes[index] = value
    const next = { ...card, notes }
    setStorageUnavailable(!writeSavedCard(next))
    setCard(next)
  }

  function saveNotes() {
    setView('mission')
    setNotice(language === 'pt' ? 'Suas descobertas ficaram salvas neste dispositivo.' : 'Your discoveries are saved on this device.')
  }

  async function copyCard() {
    if (!card) return
    const text = `${card.mission.title}\n${card.mission.question}\n${card.mission.steps.map((step) => `• ${step}`).join('\n')}\n\n${card.notes.filter(Boolean).join('\n')}`
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const field = document.createElement('textarea'); field.value = text; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select()
        const copied = document.execCommand('copy'); field.remove()
        if (!copied) throw new Error('Copy unavailable')
      }
      setNotice(t.copied)
    } catch { setNotice(language === 'pt' ? 'Não foi possível copiar neste navegador.' : 'Copy is unavailable in this browser.') }
  }

  function clearCard() {
    clearSavedCard()
    setCard(null); setView('prepare'); setNotice('')
  }

  return <main className="page">
    <header className="topbar"><a className="wordmark" href="#top" aria-label={t.brand}><span className="sunmark" aria-hidden="true">✳</span>{t.brand}</a><button className="language" type="button" onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}>{t.language}</button></header>
    <section id="top" className="intro"><div className="intro-copy"><p className="eyebrow">{t.eyebrow}</p><h1>{t.lead.split('\n').map((line) => <span key={line}>{line}</span>)}</h1><p className="lede">{t.intro}</p><div className="orbit" aria-hidden="true"><span className="orbit-sun">✳</span><span className="orbit-leaf">⌁</span><span className="orbit-dot" /></div></div><div className="sun-card" aria-hidden="true"><span>✳</span><small>LOOK<br />CLOSER</small></div></section>

    {view === 'prepare' && <section className="panel prepare" aria-labelledby="prepare-title"><div className="section-head"><span className="step-number">01</span><div><p className="eyebrow">{language === 'pt' ? 'COMECE POR AQUI' : 'START HERE'}</p><h2 id="prepare-title">{language === 'pt' ? 'Prepare sua pausa' : 'Set up your pause'}</h2></div></div>
      <fieldset><legend>{t.duration}</legend><div className="choice-row">{[5, 10, 15].map((minutes) => <button type="button" className={`choice ${duration === minutes ? 'selected' : ''}`} aria-pressed={duration === minutes} key={minutes} onClick={() => setDuration(minutes)}>{minutes} <small>{t.minutes}</small></button>)}</div></fieldset>
      <fieldset><legend>{t.place}</legend><div className="choice-row">{(Object.keys(t.places) as Array<keyof typeof t.places>).map((place) => <button type="button" className={`choice ${environment === place ? 'selected' : ''}`} aria-pressed={environment === place} key={place} onClick={() => setEnvironment(place)}>{t.places[place]}</button>)}</div></fieldset>
      <fieldset><legend>{t.movement}</legend><div className="choice-row">{(['still', 'walk'] as const).map((pace) => <button type="button" className={`choice ${movement === pace ? 'selected' : ''}`} aria-pressed={movement === pace} key={pace} onClick={() => setMovement(pace)}>{pace === 'still' ? t.still : t.walk}</button>)}</div></fieldset>
      <fieldset><legend>{t.focus}</legend><div className="choice-row">{(Object.keys(t.focuses) as Array<keyof typeof t.focuses>).map((item) => <button type="button" className={`choice ${focus === item ? 'selected' : ''}`} aria-pressed={focus === item} key={item} onClick={() => setFocus(item)}>{t.focuses[item]}</button>)}</div></fieldset>
      <label className="context-label" htmlFor="context">{t.context}</label><textarea id="context" maxLength={200} value={context} onChange={(event) => setContext(event.target.value)} placeholder={t.contextHint} rows={2} />
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="button" onClick={createMission} disabled={busy}>{busy ? t.loading : <>{t.generate}<span aria-hidden="true">↗</span></>}</button>
    </section>}

    {view === 'mission' && <section className="panel mission" aria-labelledby="mission-title">{card ? <><div className="section-head"><span className="step-number">02</span><div><p className="eyebrow">{t.mission} · {card.mission.duration} {t.minutes}</p><h2 id="mission-title">{card.mission.title}</h2></div></div><p className="question">{card.mission.question}</p><ol className="steps">{card.mission.steps.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol><p className="safety">{t.safety}</p><p className="saved-note">✓ {t.saved}</p><div className="button-row"><button className="primary" type="button" onClick={() => setView('return')}>{t.returnButton}<span aria-hidden="true">↗</span></button><button className="text-button" type="button" onClick={() => setView('prepare')}>{t.change}</button></div></> : <><p>{t.empty}</p><button className="primary" onClick={() => setView('prepare')}>{t.change}</button></>}</section>}

    {view === 'return' && <section className="panel return" aria-labelledby="return-title"><div className="section-head"><span className="step-number">03</span><div><p className="eyebrow">{language === 'pt' ? 'BEM-VINDA DE VOLTA' : 'WELCOME BACK'}</p><h2 id="return-title">{t.return}</h2></div></div><p className="lede return-lede">{t.note}</p>{card && <><div className="return-prompt">{card.mission.question}</div>{t.placeholders.map((placeholder, index) => <label className="sr-only" key={placeholder} htmlFor={`note-${index}`}>{placeholder}</label>)}{t.placeholders.map((placeholder, index) => <textarea className="note" key={placeholder} id={`note-${index}`} maxLength={240} rows={2} value={card.notes[index]} onChange={(event) => updateNote(index, event.target.value)} placeholder={placeholder} />)}</>}<div className="button-row"><button className="primary" type="button" onClick={saveNotes}>{t.finish}<span aria-hidden="true">✓</span></button></div><div className="utility-row"><button className="text-button" type="button" onClick={copyCard}>{t.copy}</button><button className="text-button danger" type="button" onClick={clearCard}>{t.clear}</button></div></section>}

    <footer><p>{t.safety}</p><a href="https://ai.google.dev/gemma" target="_blank" rel="noreferrer">{language === 'pt' ? 'Feito com Gemma' : 'Made with Gemma'} ↗</a></footer>
    {storageUnavailable && <output className="notice">{language === 'pt' ? 'Não foi possível guardar neste dispositivo.' : 'Could not save on this device.'}</output>}
    {notice && <output className="notice">{notice}</output>}
    {error && view !== 'prepare' && <div className="notice error-notice" role="alert">{error} <button onClick={() => setView('prepare')}>{t.retry}</button></div>}
  </main>
}

export default App
