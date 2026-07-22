import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
app.use(express.json())

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PERSONALITIES_DIR = process.env.OPENAI_PERSONALITIES_DIR || 'personalities'
const DEFAULT_PERSONALITY = process.env.OPENAI_DEFAULT_PERSONALITY || 'default'

function readTextFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const content = fs.readFileSync(filePath, 'utf8').trim()
  return content || null
}

function loadInstructions() {
  const instructionsFile = process.env.OPENAI_REVIEW_INSTRUCTIONS_FILE || 'review-instructions.txt'
  const instructionsPath = path.isAbsolute(instructionsFile)
    ? instructionsFile
    : path.join(__dirname, instructionsFile)

  const fileContent = readTextFileIfExists(instructionsPath)
  if (fileContent) {
    return fileContent
  }

  if (process.env.OPENAI_REVIEW_INSTRUCTIONS) {
    return process.env.OPENAI_REVIEW_INSTRUCTIONS
  }

  return [
    'You are an expert Amazon product review analyst.',
    'Provide concise, practical analysis based only on user-provided product data.',
    'Return clear sections: Summary, Rating Analysis, Improvement Suggestions, Key Insights.'
  ].join(' ')
}

function loadPersonality(personalityKey) {
  const safeKey = (personalityKey || DEFAULT_PERSONALITY).toLowerCase().trim()

  if (!/^[a-z0-9_-]+$/.test(safeKey)) {
    return null
  }

  const personalityPath = path.join(__dirname, PERSONALITIES_DIR, `${safeKey}.txt`)
  return readTextFileIfExists(personalityPath)
}

function buildInstructions(personalityKey) {
  const baseInstructions = loadInstructions()
  const personalityInstructions = loadPersonality(personalityKey)

  if (!personalityInstructions) {
    return baseInstructions
  }

  return `${baseInstructions}\n\n${personalityInstructions}`
}

const REVIEW_INSTRUCTIONS = buildInstructions(DEFAULT_PERSONALITY)

const FETCH_REVIEW_CONTEXT = (process.env.FETCH_REVIEW_CONTEXT || 'true').toLowerCase() === 'true'
const REVIEW_FETCH_TIMEOUT_MS = Number(process.env.REVIEW_FETCH_TIMEOUT_MS || 6000)
const REVIEW_CONTEXT_CHAR_LIMIT = Number(process.env.REVIEW_CONTEXT_CHAR_LIMIT || 5000)

function buildAnalysisMessage({ productTitle, productDescription, stars, additionalNotes, customerReviewsUrl }) {
  return `Product Review Data for Analysis:

Product Title: ${productTitle}
Product Description: ${productDescription}
Star Rating: ${stars}/5 stars
Additional Notes: ${additionalNotes || 'None provided'}
Customer Reviews URL: ${customerReviewsUrl || 'None provided'}`
}

function isValidReviewUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }
    return true
  } catch {
    return false
  }
}

function sanitizeHtmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchReviewContext(customerReviewsUrl) {
  if (!FETCH_REVIEW_CONTEXT || !customerReviewsUrl || !isValidReviewUrl(customerReviewsUrl)) {
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REVIEW_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(customerReviewsUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'AmazonReviewer/1.0 (+review-context-fetch)'
      }
    })

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      return null
    }

    const html = await response.text()
    const text = sanitizeHtmlToText(html)
    if (!text) {
      return null
    }

    return text.slice(0, REVIEW_CONTEXT_CHAR_LIMIT)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function buildModelInput(payload) {
  const baseMessage = buildAnalysisMessage(payload)
  const fetchedContext = await fetchReviewContext(payload.customerReviewsUrl)

  if (!fetchedContext) {
    return `${baseMessage}\n\nCustomer Reviews Page Context: not available (could not fetch or parse).`
  }

  return `${baseMessage}\n\nCustomer Reviews Page Context (truncated):\n${fetchedContext}`
}

function validatePayload({ productTitle, productDescription, stars }) {
  return Boolean(productTitle && productDescription && stars)
}

app.post('/api/analyze', async (req, res) => {
  const { productTitle, productDescription, stars, additionalNotes, customerReviewsUrl } = req.body

  if (!validatePayload({ productTitle, productDescription, stars, customerReviewsUrl })) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const message = `${await buildModelInput({ productTitle, productDescription, stars, additionalNotes, customerReviewsUrl })}

Please analyze this product review data according to your training.`

    const thread = await openai.beta.threads.create({
      messages: [{ role: 'user', content: message }]
    })

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT
    })

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id)
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant')

      if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
        return res.json({ content: assistantMessage.content[0].text.value })
      }
    }

    res.status(500).json({ error: `Run failed with status: ${run.status}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to analyze product'
    res.status(500).json({ error: message })
  }
})

app.post('/api/analyze-responses', async (req, res) => {
  const { productTitle, productDescription, stars, additionalNotes, customerReviewsUrl, personality } = req.body

  if (!validatePayload({ productTitle, productDescription, stars, customerReviewsUrl })) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const message = await buildModelInput({
      productTitle,
      productDescription,
      stars,
      additionalNotes,
      customerReviewsUrl
    })

    const response = await openai.responses.create({
      model: process.env.OPENAI_RESPONSES_MODEL || 'gpt-4.1-mini',
      instructions: buildInstructions(personality),
      input: message
    })

    const content = response.output_text || ''

    if (!content.trim()) {
      return res.status(500).json({ error: 'No response content received from Responses API' })
    }

    return res.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to analyze product via Responses API'
    return res.status(500).json({ error: message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
