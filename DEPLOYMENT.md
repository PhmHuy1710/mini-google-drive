# Deployment Guide for Mini Google Drive

## 🚀 Deploying to Vercel

### Prerequisites
1. Vercel account
2. Google Drive API credentials
3. GitHub repository

### Step 1: Prepare Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REFRESH_TOKEN=your_google_refresh_token_here
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
NODE_ENV=production
SESSION_SECRET=your_secure_session_secret_here
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_REFRESH_TOKEN
vercel env add SESSION_SECRET
vercel env add NODE_ENV

# Redeploy with environment variables
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set environment variables in Project Settings
4. Deploy

### Step 3: Configure Google Drive API
Update your Google Cloud Console OAuth 2.0 credentials:
- Add `https://mini-google-drive.vercel.app` to authorized origins
- Add `https://mini-google-drive.vercel.app/auth/callback` to authorized redirect URIs

### Step 4: Test Deployment
Visit `https://mini-google-drive.vercel.app` and test all features.

## 📝 Important Notes

### Environment Variables
- **PORT**: Automatically set by Vercel (don't set manually)
- **NODE_ENV**: Set to "production" for Vercel
- **VERCEL**: Automatically set to "1" by Vercel

### File Uploads
- Vercel has a 50MB limit for serverless functions
- Large file uploads may timeout (30s limit)
- Consider using Vercel Pro for higher limits

### Domain Configuration
- Default: `https://mini-google-drive.vercel.app`
- Custom domain: Configure in Vercel dashboard

## 🔧 Local Development vs Production

### Local Development
```bash
npm run dev  # Uses nodemon, PORT=3001
```

### Production (Vercel)
- Serverless functions
- Automatic scaling
- No PORT configuration needed
- 30-second timeout limit
