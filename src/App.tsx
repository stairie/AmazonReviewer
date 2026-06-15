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
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      setAiResponse({
        content: data.content,
        timestamp: new Date()
      })

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
        <div className='form-group'>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Submit for AI Analysis'}
          </button>
          <button
            type="button"
            className="reset-btn"
            style={{float: 'right', backgroundColor: '#f44336', color: 'white', marginTop: '10px'}}
            onClick={() => {
              setFormData({
                productTitle: '',
                productDescription: '',
                stars: 1,
                additionalNotes: '',
                customerReviewsUrl: ''
              })
              setAiResponse(null)
              setError(null)
            }}
            disabled={isLoading}
          >
            Reset Form
          </button>

        </div>

        
      </form>

      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <p className="error-help">
            Make sure the backend server is running and configured with valid OpenAI credentials.
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
          <h3>AI Results</h3>
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
