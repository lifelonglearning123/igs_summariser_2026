# Vercel Deployment - Frontend Only (EASIEST)

**Everything runs on Vercel. No backend service needed. Deploy in 10 minutes.** ⚡

---

## 🚀 Quick Steps

### Step 1: Push to GitHub

**Windows:**
```bash
deploy.bat
```

**Mac/Linux:**
```bash
bash deploy.sh
```

**Or manually:**
```bash
git init
git add .
git commit -m "Initial commit: IGS Summariser"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/igs-summariser.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Enter: `https://github.com/YOUR_USERNAME/igs-summariser.git`
5. Click **"Import"** → **"Deploy"**
6. Wait for deployment... ✨

### Step 3: Set Environment Variables

In Vercel project settings, add:

| Name | Value |
|------|-------|
| `OPENAI_API_KEY` | `sk-your-actual-api-key` |
| `JWT_SECRET` | `any-random-string` |

### Step 4: Redeploy

Click **"Deployments"** → Latest → **"Redeploy"**

---

## ✅ That's It!

Your app is now live at:
```
https://your-project.vercel.app
```

Login with:
- Email: `demo@example.com`
- Password: `demo123`

---

## 🎯 Why This is Better

✅ **One deployment** (Vercel only)
✅ **No separate backend** service needed
✅ **No Railway** or other services
✅ **Completely free** ($0/month)
✅ **Automatic updates** on git push
✅ **Built-in API routes** on Vercel
✅ **Zero maintenance** of separate services

---

## 🔐 Environment Variables

Generate a secure JWT_SECRET:

**Windows (PowerShell):**
```powershell
$bytes = [byte[]]::new(32)
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

Use the output as `JWT_SECRET` in Vercel.

---

## 📝 Updating Your App

After deployment, updates are automatic:

```bash
git add .
git commit -m "Update: your changes"
git push origin main
```

Vercel auto-deploys within seconds! 🚀

---

## 🧪 Testing

1. Open your Vercel URL
2. Login with demo credentials
3. Upload a .txt or .docx file
4. Should show action points and recommendations
5. Download results

If it works locally but not on Vercel, check:
- OpenAI API key is valid
- JWT_SECRET matches between local and Vercel
- Check Vercel "Logs" for errors

---

## ⚠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| API key error | Add `OPENAI_API_KEY` to Vercel env vars |
| Login fails | Check `JWT_SECRET` in Vercel env vars |
| Build fails | Check Node version (18+), run `npm install` locally |
| Can't find file upload | Check browser console (F12) for errors |

---

## 🎉 Deployment Complete!

**Your app URL:**
```
https://your-project.vercel.app
```

**Share this with users!** ✨

No backend complexity. No extra services. Just Vercel. Perfect! 🚀
