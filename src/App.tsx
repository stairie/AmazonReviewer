import { useState } from 'react'
import './App.css'

interface FormData {
  productTitle: string
  productDescription: string
  stars: number
  additionalNotes: string
  customerReviewsUrl: string
}

interface AIResponse {
  content: string
  timestamp: Date
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    productTitle: '',
    productDescription: '',
    stars: 1,
    additionalNotes: '',
    customerReviewsUrl: ''
  })
  
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setAiResponse(null)

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT

      if (!apiKey || !assistantId) {
        throw new Error('Missing OpenAI API key or Assistant ID in environment variables')
      }

      // Prepare the message for your trained assistant
      const message = `Product Review Data for Analysis:

Product Title: ${formData.productTitle}
Product Description: ${formData.productDescription}
Star Rating: ${formData.stars}/5 stars
Additional Notes: ${formData.additionalNotes || 'None provided'}
Customer Reviews URL: ${formData.customerReviewsUrl}

Please analyze this product review data according to your training.`

      // Create a thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: message
            }
          ]
        })
      })

      if (!threadResponse.ok) {
        throw new Error(`Failed to create thread: ${threadResponse.status}`)
      }

      const thread = await threadResponse.json()

      // Create a run with your assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        })
      })

      if (!runResponse.ok) {
        throw new Error(`Failed to create run: ${runResponse.status}`)
      }

      const run = await runResponse.json()

      // Poll for completion
      let runStatus = run
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        })

        if (!statusResponse.ok) {
          throw new Error(`Failed to check run status: ${statusResponse.status}`)
        }

        runStatus = await statusResponse.json()
      }

      if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        })

        if (!messagesResponse.ok) {
          throw new Error(`Failed to get messages: ${messagesResponse.status}`)
        }

        const messages = await messagesResponse.json()
        const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant')
        
        if (assistantMessage && assistantMessage.content[0]?.text?.value) {
          setAiResponse({
            content: assistantMessage.content[0].text.value,
            timestamp: new Date()
          })
        } else {
          throw new Error('No response received from assistant')
        }
      } else {
        throw new Error(`Run failed with status: ${runStatus.status}`)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing your request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'stars' ? parseInt(value) : value
    }))
  }

  return (
    <div className="app">
      <header>
        <h1>Amazon Product Review Form</h1>
        <p>Submit your product review details</p>
      </header>

      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label htmlFor="productTitle">Product Title</label>
          <input
            type="text"
            id="productTitle"
            name="productTitle"
            value={formData.productTitle}
            onChange={handleInputChange}
            required
            placeholder="Enter the product title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="productDescription">Product Description</label>
          <textarea
            id="productDescription"
            name="productDescription"
            value={formData.productDescription}
            onChange={handleInputChange}
            required
            placeholder="Describe the product"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="stars">Star Rating</label>
          <select
            id="stars"
            name="stars"
            value={formData.stars}
            onChange={handleInputChange}
            required
          >
            <option value={1}>1 Star</option>
            <option value={2}>2 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={5}>5 Stars</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="additionalNotes">Additional Notes</label>
          <textarea
            id="additionalNotes"
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleInputChange}
            placeholder="Any additional notes about the product"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="customerReviewsUrl">Customer Reviews URL</label>
          <input
            type="url"
            id="customerReviewsUrl"
            name="customerReviewsUrl"
            value={formData.customerReviewsUrl}
            onChange={handleInputChange}
            required
            placeholder="https://amazon.com/product-reviews/..."
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Submit for AI Analysis'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <p className="error-help">
            Make sure you have set both VITE_OPENAI_API_KEY and VITE_OPENAI_ASSISTANT in your .env file.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Sending your review data to AI for analysis...</p>
        </div>
      )}

      {aiResponse && (
        <div className="ai-response">
          <h3>AI Analysis Results</h3>
          <div className="response-content">
            <pre>{aiResponse.content}</pre>
          </div>
          <p className="response-timestamp">
            Generated on: {aiResponse.timestamp.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

export default App
