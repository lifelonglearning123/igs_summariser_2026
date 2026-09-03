# Vercel Deployment Guide

This guide will help you deploy the IGS Summariser to Vercel.

## 📋 Prerequisites

1. GitHub account with your code pushed
2. Vercel account (free tier available)
3. Backend deployed separately (see below)
4. OpenAI API key

## 🚀 Quick Deployment Steps

### Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit: IGS Summariser app"
git branch -M main
git remote add origin https://github.com/yourusername/igs-summariser.git
git push -u origin main
```

### Step 2: Deploy Frontend to Vercel

**Option A: Using Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel
```

**Option B: Using Vercel Web Dashboard**

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Enter your GitHub repository URL
4. Framework: Next.js (auto-detected)
5. Click "Deploy"

### Step 3: Set Environment Variables on Vercel

After deployment starts:

1. Go to your Vercel project settings
2. Click "Environment Variables"
3. Add these variables:

```
NEXT_PUBLIC_API_URL = https://your-backend-api.com
JWT_SECRET = your-secret-key-here
```

### Step 4: Deploy Backend

You have several options for deploying the FastAPI backend:

---

## 🔧 Backend Deployment Options

### Option A: Railway (Recommended - Simple)

**Cost:** Free tier available

**Steps:**

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Create `railway.json` in your project:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfile": "backend/Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "python backend/main.py"
  }
}
```

5. Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

CMD ["python", "main.py"]
```

6. Set environment variables in Railway dashboard:
   - `OPENAI_API_KEY`
   - `JWT_SECRET`

7. Note your Railway API URL (e.g., `https://igs-backend-production.railway.app`)

8. Update Vercel environment variable:
   - `NEXT_PUBLIC_API_URL = https://igs-backend-production.railway.app`

---

### Option B: Render (Free Tier Available)

**Cost:** Free tier available

**Steps:**

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name:** igs-summariser-backend
   - **Environment:** Python 3
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `python backend/main.py`
   - **Instance Type:** Free (spins down after 15 min inactivity)

5. Set environment variables:
   - `OPENAI_API_KEY`
   - `JWT_SECRET`

6. Note your Render URL and update Vercel environment

---

### Option C: Heroku (Paid)

**Cost:** ~$50-100/month

Similar setup to Railway/Render, but requires credit card.

---

### Option D: Keep Backend Local (Development)

For testing purposes, you can run the backend locally:

```bash
cd backend
python main.py
```

And set:
```
NEXT_PUBLIC_API_URL = http://localhost:8000
```

---

## 📝 Dockerfile for Backend

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Set environment
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run the app
CMD ["python", "main.py"]
```

---

## 🔐 Environment Variables

### Frontend (.env on Vercel)
```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
JWT_SECRET=your-random-secret-key
```

### Backend (on Railway/Render/Heroku)
```
OPENAI_API_KEY=sk-your-api-key
JWT_SECRET=your-random-secret-key
DATABASE_URL=postgresql://user:pass@host/db  # (optional)
HOST=0.0.0.0
PORT=8000
```

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed (Railway/Render/other)
- [ ] Environment variables set on both platforms
- [ ] CORS configured in backend for Vercel domain
- [ ] Tested login functionality
- [ ] Tested file upload
- [ ] Tested results generation
- [ ] Domain configured (optional)

---

## 🧪 Testing After Deployment

### Test Login
```bash
curl -X POST "https://your-vercel-app.vercel.app/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

### Check Backend Health
```bash
curl https://your-backend-api.com/health
```

---

## 🔧 Troubleshooting

### Frontend doesn't connect to backend
1. Check `NEXT_PUBLIC_API_URL` in Vercel settings
2. Verify backend is running and accessible
3. Check browser console (F12) for CORS errors
4. Ensure backend CORS allows Vercel domain

### Backend CORS Error
Update `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API Key Error
- Verify `OPENAI_API_KEY` is set in backend environment
- Check API key is valid at https://platform.openai.com/api-keys
- Ensure it has access to gpt-4o model

### Cold Start Issues
- Railway/Render free tier spins down after inactivity
- Consider upgrading to paid tier for production
- Add monitoring/ping to keep alive

---

## 💰 Estimated Monthly Costs

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | $0 | $20-100 |
| **Railway** | $0 | ~$5-50 |
| **Render** | $0 | ~$7-100 |
| **OpenAI API** | - | $0-500+ |
| **Domain** | - | $10-15 |

Total: **~$30-665/month** depending on configuration

---

## 🎯 Next Steps

1. Push code to GitHub
2. Deploy frontend to Vercel
3. Choose and deploy backend
4. Configure environment variables
5. Test all functionality
6. Set up custom domain (optional)
7. Monitor usage and costs

---

## 📚 Additional Resources

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/

---

## ✨ After Successful Deployment

Your app will be live at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-backend-api.com`

Celebrate! 🎉 Your IGS Summariser is now on the web!
