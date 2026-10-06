import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateMission, validateMissionInput } from './mission.js'

const app = express()
const port = Number(process.env.PORT) || 3000
const model = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it'
const allowedModels = new Set(['gemma-4-26b-a4b-it', 'gemma-4-31b-it'])
const apiKey = process.env.GEMINI_API_KEY
const windowMs = 60_000
const requestTimes = []

app.disable('x-powered-by')
app.use(express.json({ limit: '4kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', generationConfigured: Boolean(apiKey), model: allowedModels.has(model) ? model : 'invalid-model' })
})

app.post('/api/missions', async (request, response) => {
  try {
    if (!allowedModels.has(model)) return response.status(503).json({ error: 'Model configuration is invalid.' })
    const input = validateMissionInput(request.body)
    const now = Date.now()
    while (requestTimes.length && requestTimes[0] < now - windowMs) requestTimes.shift()
    if (requestTimes.length >= 12) return response.status(429).json({ error: 'Too many attempts. Please wait a minute.' })
    requestTimes.push(now)
    const mission = await generateMission(input, { apiKey, model })
    response.json({ ...mission, promptVersion: 1, source: 'gemma' })
  } catch (error) {
    const status = error.status || (error.message.startsWith('Invalid mission preferences') ? 400 : 422)
    const messages = {
      400: 'Check the mission options and try again.',
      429: 'The free model quota is busy. Please try again later.',
      422: 'The model returned a mission we could not use. Please try again.',
      502: 'The model is temporarily unavailable. Please try again later.',
      503: 'Mission generation is not configured yet.',
      504: 'The model took too long to respond. Please try again.',
    }
    response.status(status).json({ error: messages[status] || 'Something went wrong. Please try again.' })
  }
})

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')))
  app.get('*splat', (_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  app.use(vite.middlewares)
  app.use(async (_request, response, next) => {
    try {
      const html = await vite.transformIndexHtml('/', await (await import('node:fs/promises')).readFile(path.join(root, 'index.html'), 'utf8'))
      response.status(200).type('html').send(html)
    } catch (error) { next(error) }
  })
}

app.listen(port, '0.0.0.0')
