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

## 🐛 Troubleshooting

### Common Deployment Errors

#### 1. "functions property cannot be used with builds"
**Error**: `The functions property cannot be used in conjunction with the builds property`
**Solution**: Use only `builds` property in `vercel.json` (already fixed)

#### 2. "name property is deprecated"
**Warning**: `The name property in vercel.json is deprecated`
**Solution**: Remove `name` property from `vercel.json` (already fixed)

#### 3. Environment Variables Not Set
**Error**: Application fails to start
**Solution**: Ensure all required environment variables are set in Vercel dashboard:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REFRESH_TOKEN
- SESSION_SECRET
- NODE_ENV

#### 4. Google API Authentication Errors
**Error**: "Invalid client" or "Unauthorized"
**Solution**:
1. Update Google Cloud Console OAuth settings
2. Add `https://mini-google-drive.vercel.app` to authorized origins
3. Verify all Google API credentials are correct

#### 5. File Upload Timeouts
**Error**: Large file uploads fail
**Solution**:
- Vercel has 50MB limit for serverless functions
- Consider upgrading to Vercel Pro for higher limits
- Implement chunked uploads for large files

### Verification Steps
After deployment, test these features:
- [ ] Homepage loads correctly
- [ ] Google Drive authentication works
- [ ] File listing displays
- [ ] File upload works (small files)
- [ ] File download works
- [ ] Folder creation works
- [ ] File deletion works
- [ ] Search functionality works
