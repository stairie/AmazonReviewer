# Amazon Product Review Analyzer

A React + TypeScript application that allows you to submit Amazon product review data to a trained OpenAI Assistant for intelligent analysis and insights.

## 🚀 Features

- **Product Review Form** - Clean, responsive form to capture product details
- **AI-Powered Analysis** - Integrates with your custom OpenAI Assistant for tailored insights
- **Real-time Processing** - Live feedback with loading states and error handling
- **TypeScript Support** - Full type safety for robust development
- **Modern Stack** - Built with React 19, Vite, and TypeScript

## 📋 Form Fields

- **Product Title** (Required) - The name/title of the product
- **Product Description** (Required) - Detailed description of the product
- **Star Rating** (Required) - Rating from 1-5 stars
- **Additional Notes** (Optional) - Any extra notes about the product
- **Customer Reviews URL** (Required) - Link to Amazon product reviews

## 🛠️ Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- NPM or Yarn
- OpenAI API account with a trained Assistant

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd AmazonReviewer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # OpenAI API Configuration
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_OPENAI_ASSISTANT=your_assistant_id_here
   ```

   **Required Environment Variables:**

   - `VITE_OPENAI_API_KEY` - Your OpenAI API key from [platform.openai.com](https://platform.openai.com)
   - `VITE_OPENAI_ASSISTANT` - The ID of your trained OpenAI Assistant (format: `asst_xxxxxxxxxxxxx`)

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:5173](http://localhost:5173)

## 🔧 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint for code quality

## 🤖 OpenAI Assistant Setup

To use this application, you'll need:

1. **OpenAI API Account** - Sign up at [platform.openai.com](https://platform.openai.com)
2. **Trained Assistant** - Create and train an Assistant for product review analysis
3. **API Key** - Generate an API key from your OpenAI dashboard
4. **Assistant ID** - Copy your Assistant's ID (starts with `asst_`)

## 💡 How It Works

1. Fill out the product review form with your Amazon product details
2. Click "Submit for AI Analysis"
3. The application creates a thread and sends your data to your trained OpenAI Assistant
4. Your assistant processes the information according to its training
5. View the AI-generated analysis and insights

## 🔒 Security

- Environment variables are used to protect API credentials
- `.env` file is excluded from version control via `.gitignore`
- All API communication is handled securely through OpenAI's official endpoints

## 🏗️ Built With

- **React 19** - UI Framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **OpenAI Assistants API** - AI integration
- **CSS3** - Modern styling with responsive design

## 📁 Project Structure

```
AmazonReviewer/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Entry point
│   └── ...
├── .env                 # Environment variables (create this)
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## 🚀 Deployment

### Automatic Deployment to EC2 via GitHub Actions

This project includes a GitHub Actions workflow that automatically deploys to your EC2 instance when you push to the main branch.

#### EC2 Setup

1. **Launch an EC2 instance** (Ubuntu 20.04+ recommended)

2. **Install Node.js and npm**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install and configure Nginx**

   ```bash
   sudo apt update
   sudo apt install nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

4. **Create application directory**

   ```bash
   sudo mkdir -p /var/www/amazon-reviewer
   sudo chown -R $USER:$USER /var/www/amazon-reviewer
   ```

5. **Clone your repository**

   ```bash
   cd /var/www/amazon-reviewer
   git clone https://github.com/YOUR_USERNAME/AmazonReviewer.git .
   ```

6. **Configure Nginx**

   Create `/etc/nginx/sites-available/amazon-reviewer`:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain or IP

       root /var/www/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Enable gzip compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   }
   ```

7. **Enable the site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/amazon-reviewer /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

#### GitHub Secrets Setup

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

**Required Secrets:**

- `EC2_HOST` - Your EC2 instance public IP or domain
- `EC2_USERNAME` - SSH username (usually `ubuntu` for Ubuntu instances)
- `EC2_SSH_KEY` - Your EC2 private key (entire content of your .pem file)
- `EC2_PORT` - SSH port (usually `22`)
- `VITE_OPENAI_API_KEY` - Your OpenAI API key
- `VITE_OPENAI_ASSISTANT` - Your OpenAI Assistant ID

#### SSH Key Setup

1. **Generate SSH key pair** (if you don't have one):

   ```bash
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   ```

2. **Add public key to EC2**:

   ```bash
   # On your EC2 instance
   echo "your-public-key-content" >> ~/.ssh/authorized_keys
   ```

3. **Add private key to GitHub Secrets**:
   - Copy the entire content of your private key file
   - Paste it as the `EC2_SSH_KEY` secret in GitHub

#### Security Group Configuration

Make sure your EC2 security group allows:

- **SSH (Port 22)** - From your IP or GitHub Actions IPs
- **HTTP (Port 80)** - From anywhere (0.0.0.0/0)
- **HTTPS (Port 443)** - From anywhere (if using SSL)

### Manual Deployment

If you prefer manual deployment:

1. Set environment variables in your hosting platform
2. Build the application: `npm run build`
3. Deploy the `dist` folder to your hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

---

**Note**: Make sure to keep your OpenAI API key secure and never commit it to version control.
