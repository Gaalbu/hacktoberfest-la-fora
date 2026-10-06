import { useEffect, useState } from 'react'
import './App.css'
import { clearSavedCard, readLanguage, readSavedCard, writeLanguage, writeSavedCard, type Language, type SavedCard } from './storage'

type Mission = { title: string; question: string; steps: string[]; duration: number; promptVersion: number; source: string }
type Card = SavedCard<Mission>

const copy = {
  en: {
    brand: 'Out There',
    pageTitle: 'Out There — a moment to notice',
    description: 'A small observation mission to step out of autopilot, without going far.',
    eyebrow: 'A MOMENT TO NOTICE',
    lead: 'What is here\naround you?',
    intro: 'A small observation mission to step out of autopilot, without going far or needing to know anything in advance.',
    duration: 'Your time', place: 'Where are you?', movement: 'Your pace', focus: 'Notice',
    context: 'A detail about this place (optional)', contextHint: 'Up to 200 characters. No address, please.',
    generate: 'Make my mission', minutes: 'minutes', still: 'Stay nearby', walk: 'Take a short walk',
    places: { porch: 'Porch', yard: 'Yard', park: 'Familiar park' },
    focuses: { shapes: 'Shapes', sounds: 'Sounds', light: 'Light & shade' },
    loading: 'Making your mission…', error: 'Could not make a mission right now.', retry: 'Try again',
    mission: 'YOUR MISSION', return: 'What did you notice?',
    note: 'Write down what you noticed. It can be something small.',
    placeholders: ['One thing I had not noticed…', 'A sound, shape or detail…', 'What surprised me…'],
    finish: 'Save my discoveries', clear: 'Clear card', copy: 'Copy card', copied: 'Card copied',
    saved: 'Mission saved on this device.',
    safety: 'Stay somewhere familiar and permitted. Do not touch, collect or feed wildlife. If anything feels unsafe, head back.',
    empty: 'No saved mission yet.', generatingOffline: 'Connect to the internet to make a new mission.',
    returnButton: 'I am back', change: 'Choose another mission', languageLabel: 'Choose language',
    start: 'START HERE', startTitle: 'Set up your pause', welcome: 'WELCOME BACK',
    copyUnavailable: 'Copy is unavailable in this browser.', storageUnavailable: 'Could not save on this device.',
    lookCloser: 'LOOK\nCLOSER', madeWith: 'Made with Gemma',
    invalidOptions: 'Check the mission options and try again.',
    quota: 'The free model quota is busy. Please try again later.',
    unusable: 'The model returned a mission we could not use. Please try again.',
    unavailable: 'The model is temporarily unavailable. Please try again later.',
    timeout: 'The model took too long to respond. Please try again.',
    notConfigured: 'Mission generation is not configured yet.',
  },
  'pt-BR': {
    brand: 'Out There',
    pageTitle: 'Out There — um momento para perceber',
    description: 'Uma pequena missão de observação para sair do piloto automático sem ir longe.',
    eyebrow: 'UM MOMENTO PARA PERCEBER',
    lead: 'O que existe\npor aqui?',
    intro: 'Uma pequena missão de observação para sair do piloto automático sem ir longe nem precisar saber nada antes.',
    duration: 'Seu tempo', place: 'Onde você está?', movement: 'Seu ritmo', focus: 'Observe',
    context: 'Um detalhe deste lugar (opcional)', contextHint: 'Até 200 caracteres. Sem endereço, por favor.',
    generate: 'Criar minha missão', minutes: 'minutos', still: 'Ficar por perto', walk: 'Fazer uma caminhada curta',
    places: { porch: 'Varanda', yard: 'Quintal', park: 'Parque conhecido' },
    focuses: { shapes: 'Formas', sounds: 'Sons', light: 'Luz e sombra' },
    loading: 'Preparando sua missão…', error: 'Não foi possível criar uma missão agora.', retry: 'Tentar novamente',
    mission: 'SUA MISSÃO', return: 'O que você percebeu?',
    note: 'Anote o que percebeu. Pode ser algo pequeno.',
    placeholders: ['Algo que eu não tinha percebido…', 'Um som, forma ou detalhe…', 'O que me surpreendeu…'],
    finish: 'Salvar minhas descobertas', clear: 'Apagar cartão', copy: 'Copiar cartão', copied: 'Cartão copiado',
    saved: 'Missão salva neste dispositivo.',
    safety: 'Fique em um lugar conhecido e permitido. Não toque, recolha ou alimente animais. Se algo parecer inseguro, volte.',
    empty: 'Nenhuma missão salva ainda.', generatingOffline: 'Conecte-se à internet para criar uma missão.',
    returnButton: 'Voltei', change: 'Escolher outra missão', languageLabel: 'Escolher idioma',
    start: 'COMECE AQUI', startTitle: 'Prepare sua pausa', welcome: 'QUE BOM QUE VOCÊ VOLTOU',
    copyUnavailable: 'Não foi possível copiar neste navegador.', storageUnavailable: 'Não foi possível salvar neste dispositivo.',
    lookCloser: 'OLHE\nDE PERTO', madeWith: 'Feito com Gemma',
    invalidOptions: 'Confira as opções da missão e tente novamente.',
    quota: 'A cota gratuita do modelo está ocupada. Tente novamente em instantes.',
    unusable: 'O modelo não retornou uma missão que pudéssemos usar. Tente novamente.',
    unavailable: 'O modelo está temporariamente indisponível. Tente novamente em instantes.',
    timeout: 'O modelo demorou demais para responder. Tente novamente.',
    notConfigured: 'A criação de missões ainda não está configurada.',
  },
} as const

function readCard(): Card | null {
  const candidate = readSavedCard<Mission>()
  if (!candidate || typeof candidate.mission?.title !== 'string' || typeof candidate.mission.question !== 'string' || !Array.isArray(candidate.mission.steps) || candidate.mission.steps.length !== 3 || candidate.mission.steps.some((step) => typeof step !== 'string') || ![5, 10, 15].includes(candidate.mission.duration)) return null
  return candidate
}

function App() {
  const [language, setLanguage] = useState<Language>(() => readLanguage() || (navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'))
  const t = copy[language]
  useEffect(() => {
    document.documentElement.lang = language
    document.title = t.pageTitle
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.description)
  }, [language, t])
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

  async function createMission() {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ duration, environment, movement, focus, context, language }) })
      const result = await response.json()
      if (!response.ok) {
        const errors: Record<number, string> = { 400: t.invalidOptions, 422: t.unusable, 429: t.quota, 502: t.unavailable, 503: t.notConfigured, 504: t.timeout }
        throw new Error(errors[response.status] || t.error)
      }
      const next = { mission: result as Mission, notes: ['', '', ''] as [string, string, string] }
      setStorageUnavailable(!writeSavedCard(next))
      setCard(next); setView('mission')
    } catch (cause) {
      setError(!navigator.onLine ? t.generatingOffline : cause instanceof TypeError ? t.unavailable : cause instanceof Error ? cause.message : t.error)
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
    setNotice(t.saved)
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
    } catch { setNotice(t.copyUnavailable) }
  }

  function clearCard() {
    clearSavedCard()
    setCard(null); setView('prepare'); setNotice('')
  }

  return <main className="page">
    <header className="topbar"><a className="wordmark" href="#top" aria-label={t.brand}><span className="sunmark" aria-hidden="true">✳</span>{t.brand}</a><fieldset className="language-switch"><legend className="sr-only">{t.languageLabel}</legend><button type="button" aria-label="English" aria-pressed={language === 'en'} onClick={() => { setLanguage('en'); writeLanguage('en') }}>EN</button><button type="button" aria-label="Português do Brasil" aria-pressed={language === 'pt-BR'} onClick={() => { setLanguage('pt-BR'); writeLanguage('pt-BR') }}>PT-BR</button></fieldset></header>
    <section id="top" className="intro"><div className="intro-copy"><p className="eyebrow">{t.eyebrow}</p><h1>{t.lead.split('\n').map((line) => <span key={line}>{line}</span>)}</h1><p className="lede">{t.intro}</p><div className="orbit" aria-hidden="true"><span className="orbit-sun">✳</span><span className="orbit-leaf">⌁</span><span className="orbit-dot" /></div></div><div className="sun-card" aria-hidden="true"><span>✳</span><small>{t.lookCloser.split('\n').map((line) => <span key={line}>{line}</span>)}</small></div></section>

    {view === 'prepare' && <section className="panel prepare" aria-labelledby="prepare-title"><div className="section-head"><span className="step-number">01</span><div><p className="eyebrow">{t.start}</p><h2 id="prepare-title">{t.startTitle}</h2></div></div>
      <fieldset><legend>{t.duration}</legend><div className="choice-row">{[5, 10, 15].map((minutes) => <button type="button" className={`choice ${duration === minutes ? 'selected' : ''}`} aria-pressed={duration === minutes} key={minutes} onClick={() => setDuration(minutes)}>{minutes} <small>{t.minutes}</small></button>)}</div></fieldset>
      <fieldset><legend>{t.place}</legend><div className="choice-row">{(Object.keys(t.places) as Array<keyof typeof t.places>).map((place) => <button type="button" className={`choice ${environment === place ? 'selected' : ''}`} aria-pressed={environment === place} key={place} onClick={() => setEnvironment(place)}>{t.places[place]}</button>)}</div></fieldset>
      <fieldset><legend>{t.movement}</legend><div className="choice-row">{(['still', 'walk'] as const).map((pace) => <button type="button" className={`choice ${movement === pace ? 'selected' : ''}`} aria-pressed={movement === pace} key={pace} onClick={() => setMovement(pace)}>{pace === 'still' ? t.still : t.walk}</button>)}</div></fieldset>
      <fieldset><legend>{t.focus}</legend><div className="choice-row">{(Object.keys(t.focuses) as Array<keyof typeof t.focuses>).map((item) => <button type="button" className={`choice ${focus === item ? 'selected' : ''}`} aria-pressed={focus === item} key={item} onClick={() => setFocus(item)}>{t.focuses[item]}</button>)}</div></fieldset>
      <label className="context-label" htmlFor="context">{t.context}</label><textarea id="context" maxLength={200} value={context} onChange={(event) => setContext(event.target.value)} placeholder={t.contextHint} rows={2} />
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="button" onClick={createMission} disabled={busy}>{busy ? t.loading : <>{t.generate}<span aria-hidden="true">↗</span></>}</button>
    </section>}

    {view === 'mission' && <section className="panel mission" aria-labelledby="mission-title">{card ? <><div className="section-head"><span className="step-number">02</span><div><p className="eyebrow">{t.mission} · {card.mission.duration} {t.minutes}</p><h2 id="mission-title">{card.mission.title}</h2></div></div><p className="question">{card.mission.question}</p><ol className="steps">{card.mission.steps.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol><p className="safety">{t.safety}</p><p className="saved-note">✓ {t.saved}</p><div className="button-row"><button className="primary" type="button" onClick={() => setView('return')}>{t.returnButton}<span aria-hidden="true">↗</span></button><button className="text-button" type="button" onClick={() => setView('prepare')}>{t.change}</button></div></> : <><p>{t.empty}</p><button className="primary" onClick={() => setView('prepare')}>{t.change}</button></>}</section>}

    {view === 'return' && <section className="panel return" aria-labelledby="return-title"><div className="section-head"><span className="step-number">03</span><div><p className="eyebrow">{t.welcome}</p><h2 id="return-title">{t.return}</h2></div></div><p className="lede return-lede">{t.note}</p>{card && <><div className="return-prompt">{card.mission.question}</div>{t.placeholders.map((placeholder, index) => <label className="sr-only" key={placeholder} htmlFor={`note-${index}`}>{placeholder}</label>)}{t.placeholders.map((placeholder, index) => <textarea className="note" key={placeholder} id={`note-${index}`} maxLength={240} rows={2} value={card.notes[index]} onChange={(event) => updateNote(index, event.target.value)} placeholder={placeholder} />)}</>}<div className="button-row"><button className="primary" type="button" onClick={saveNotes}>{t.finish}<span aria-hidden="true">✓</span></button></div><div className="utility-row"><button className="text-button" type="button" onClick={copyCard}>{t.copy}</button><button className="text-button danger" type="button" onClick={clearCard}>{t.clear}</button></div></section>}

    <footer><p>{t.safety}</p><a href="https://ai.google.dev/gemma" target="_blank" rel="noreferrer">{t.madeWith} ↗</a></footer>
    {storageUnavailable && <output className="notice">{t.storageUnavailable}</output>}
    {notice && <output className="notice">{notice}</output>}
    {error && view !== 'prepare' && <div className="notice error-notice" role="alert">{error} <button onClick={() => setView('prepare')}>{t.retry}</button></div>}
  </main>
}

export default App
