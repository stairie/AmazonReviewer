import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'

const app = express()
app.use(express.json())

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

app.post('/api/analyze', async (req, res) => {
  const { productTitle, productDescription, stars, additionalNotes, customerReviewsUrl } = req.body

  if (!productTitle || !productDescription || !stars || !customerReviewsUrl) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const message = `Product Review Data for Analysis:

Product Title: ${productTitle}
Product Description: ${productDescription}
Star Rating: ${stars}/5 stars
Additional Notes: ${additionalNotes || 'None provided'}
Customer Reviews URL: ${customerReviewsUrl}

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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
