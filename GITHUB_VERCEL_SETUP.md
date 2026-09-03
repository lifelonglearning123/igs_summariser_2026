# GitHub & Vercel Setup Guide

Complete step-by-step guide to push your code to GitHub and deploy to Vercel.

## 📋 Prerequisites

1. GitHub account (free at https://github.com)
2. Vercel account (free at https://vercel.com) 
3. Git installed on your computer

---

## 🚀 Step 1: Initialize Git Repository

In your project folder (c:\python\New IGS Summeriser):

```bash
git init
git add .
git commit -m "Initial commit: IGS Summariser application"
```

---

## 📝 Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name:** `igs-summariser`
3. **Description:** Business Coach Summary Transcriber - Modern Web App
4. **Visibility:** Public (for Vercel free tier) or Private
5. Click "Create repository"

---

## 📤 Step 3: Push Code to GitHub

After creating the repository, you'll see commands to run. Execute:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/igs-summariser.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

**Verify:** Go to your GitHub repository and confirm files are there.

---

## 🎯 Step 4: Deploy Frontend to Vercel

### Option A: Using Vercel Web Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Enter: `https://github.com/YOUR_USERNAME/igs-summariser.git`
5. Click **"Import"**
6. Click **"Continue"**
7. **Framework Preset:** `Next.js` (auto-detected)
8. Click **"Deploy"**

Vercel will automatically build and deploy your frontend! 🎉

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Choose "Yes" for defaults, then "Proceed with deployment"
```

---

## 🔐 Step 5: Set Environment Variables on Vercel

After deployment completes:

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add this variable:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-api.com` |
| `JWT_SECRET` | `your-random-secret-key` |

*Note: Replace backend URL after you deploy it*

4. Click **"Save"**
5. Go to **"Deployments"** → click latest deployment → **"Redeploy"**

---

## 🔧 Step 6: Deploy Backend to Railway (Recommended)

### Backend Setup for Railway

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub"**
4. Click **"Authorize"** (if needed)
5. Select your `igs-summariser` repository
6. Click **"Deploy Now"**

### Configure Environment Variables on Railway

1. Your Railway project dashboard opens
2. Click **"Variables"** tab
3. Add these environment variables:

```
OPENAI_API_KEY = sk-your-actual-api-key
JWT_SECRET = same-secret-as-vercel
```

4. Click **"Save"** - Railway auto-redeploys

### Get Your Backend URL

1. Go to **"Settings"** tab
2. Look for **"Domains"** section
3. You'll see your Railway URL (e.g., `https://igs-backend.railway.app`)
4. Copy this URL

---

## 🔗 Step 7: Connect Frontend to Backend

1. Go back to Vercel dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Edit `NEXT_PUBLIC_API_URL`
4. Change to your Railway backend URL: `https://igs-backend.railway.app`
5. Click **"Save"**
6. Go to **"Deployments"** → **"Redeploy"** the latest deployment

---

## ✅ Verification Checklist

- [ ] Code pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway  
- [ ] Environment variables set on Vercel
- [ ] Environment variables set on Railway
- [ ] Frontend URL: `https://your-project.vercel.app`
- [ ] Backend URL: `https://igs-backend.railway.app` (or similar)

---

## 🧪 Testing Your Deployment

### Test Login

Open your Vercel frontend URL and test:
1. Email: `demo@example.com`
2. Password: `demo123`
3. Should successfully login

### Test File Processing

1. Upload a .txt file with meeting notes
2. Should show action points and recommendations
3. Download should work

---

## 🎯 Your Live App URLs

After deployment:

| Service | URL |
|---------|-----|
| **Frontend** | `https://your-project.vercel.app` |
| **Backend API** | `https://igs-backend.railway.app` |
| **API Health** | `https://igs-backend.railway.app/health` |

Share the frontend URL with users! 🌐

---

## 🔄 Deploying Updates

After making changes:

```bash
git add .
git commit -m "Update: describe your changes"
git push origin main
```

**Vercel automatically redeploys** when you push to main branch! 🚀

---

## 📊 Monitoring

### Vercel Dashboard
- Go to https://vercel.com/dashboard
- Click your project
- **Analytics** tab for performance metrics
- **Logs** tab for errors

### Railway Dashboard
- Go to your Railway project
- **Logs** tab shows backend errors
- **Metrics** tab for performance

---

## 💰 Costs

| Service | Cost |
|---------|------|
| Vercel (free tier) | $0 |
| Railway (free tier) | $0* |
| OpenAI API | $0-500+ |
| Custom Domain | $10-15/year |

*Free tier spins down after 15 min inactivity

---

## ⚠️ Troubleshooting

### Frontend shows "Cannot connect to backend"
1. Verify `NEXT_PUBLIC_API_URL` is correct in Vercel
2. Test backend is running: `curl https://your-backend/health`
3. Redeploy frontend after changing env vars

### Backend shows "Invalid API key"
1. Verify `OPENAI_API_KEY` in Railway environment
2. Check API key at https://platform.openai.com/api-keys
3. Make sure it starts with `sk-`

### Vercel deployment fails
1. Check "Build Logs" in Vercel dashboard
2. Ensure `package.json` and `.eslintrc.json` exist
3. Verify Node version (18+)

### Railway deployment fails
1. Check "Logs" in Railway dashboard
2. Verify Dockerfile exists in `backend/`
3. Verify Python version (3.9+)

---

## 🎉 Success!

Your app is now live on the internet! Share your Vercel URL with users:

```
https://your-project.vercel.app
```

Congratulations! 🚀✨

---

## 📚 Additional Resources

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Git Guide: https://git-scm.com/book/en/v2
- GitHub Docs: https://docs.github.com
