# ✅ Vercel Deployment - Quick Path

**3 Simple Steps to Deploy**

---

## 1️⃣ Push Code to GitHub

Open PowerShell in your project folder:

```powershell
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: IGS Summariser"

# Create repository on GitHub at: https://github.com/new
# Name it: igs-summariser
# Then run:

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/igs-summariser.git
git push -u origin main
```

✅ **Done:** Code is now on GitHub

---

## 2️⃣ Deploy Frontend to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Paste: `https://github.com/YOUR_USERNAME/igs-summariser.git`
5. Click **"Import"** then **"Deploy"**
6. Wait for deployment to complete

✅ **Done:** Frontend is live at `https://your-project.vercel.app`

---

## 3️⃣ Deploy Backend to Railway

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub"**
4. Select your `igs-summariser` repository
5. Click **"Deploy Now"**
6. Add environment variables:
   - `OPENAI_API_KEY` = your API key (from https://platform.openai.com/api-keys)
   - `JWT_SECRET` = any random string (use PowerShell command below)

```powershell
# Generate random secret:
$bytes = [byte[]]::new(32)
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

7. Wait for deployment to complete
8. Copy your Railway URL (in Domains section)

✅ **Done:** Backend is live at `https://your-railway-url`

---

## 4️⃣ Connect Frontend to Backend

1. Go to Vercel dashboard → Your project
2. Click **"Settings"** → **"Environment Variables"**
3. Add/Edit:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-railway-url` (from Railway)
   - Click "Save"

4. Click **"Deployments"** → Latest deployment → **"Redeploy"**

✅ **Done:** Frontend connected to backend!

---

## 🎉 Your App is Live!

**Frontend URL:**
```
https://your-project.vercel.app
```

**Test it:**
- Email: `demo@example.com`
- Password: `demo123`
- Upload a file or paste transcript
- Should see action points and recommendations

---

## 🔑 Important Variables

### Copy from one place:
```
JWT_SECRET = (generated above)
```

### Use in Vercel:
```
NEXT_PUBLIC_API_URL = https://your-railway-url
JWT_SECRET = (same as Railway)
```

### Use in Railway:
```
OPENAI_API_KEY = sk-...
JWT_SECRET = (same as Vercel)
```

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| Frontend shows "Cannot connect" | Check `NEXT_PUBLIC_API_URL` in Vercel settings |
| API key error | Verify `OPENAI_API_KEY` in Railway |
| Frontend won't deploy | Ensure `.eslintrc.json` exists in root |
| Backend won't deploy | Ensure `backend/Dockerfile` exists |

---

## 📚 Full Docs

For detailed info:
- `GITHUB_VERCEL_SETUP.md` - Step-by-step guide
- `VERCEL_DEPLOYMENT.md` - Advanced options
- `PRODUCTION_ENV.md` - Environment variable help

---

## 🚀 You're Ready!

Push your code and deploy today! 

**Questions?** Check the detailed guides above.
