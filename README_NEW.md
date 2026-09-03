# IGS Summariser - Frontend Only

A modern, beautiful Business Coach Summary Transcriber built with **Next.js 14+** only.

## ✨ Features

✅ **Modern UI/UX** - Beautiful React interface with Tailwind CSS
✅ **Authentication** - Email/password login with JWT tokens
✅ **File Upload** - Support for .txt and .docx files
✅ **AI-Powered** - GPT-4o integration for smart summarization
✅ **Advanced Parameters** - Fine-tune AI responses
✅ **Results Export** - Download summaries as text
✅ **Single Deployment** - Deploy only to Vercel (no backend service needed)
✅ **Professional Design** - Clean, intuitive interface with gradient styling

## 🚀 Tech Stack

- **Framework**: Next.js 14+ with React
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API**: OpenAI GPT-4o
- **File Parsing**: Mammoth (for .docx files)
- **Authentication**: JWT Tokens
- **HTTP Client**: Axios

**No separate backend service needed!** Everything runs on Vercel.

---

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
```bash
cp .env.example .env.local
```

### 3. Add Your OpenAI API Key
Edit `.env.local`:
```env
OPENAI_API_KEY=sk-your-api-key-here
JWT_SECRET=your-random-secret-key
```

Get your API key from: https://platform.openai.com/api-keys

### 4. Run Development Server
```bash
npm run dev
```

### 5. Open in Browser
```
http://localhost:3000
```

### 6. Login
- Email: `demo@example.com`
- Password: `demo123`

---

## 📖 Usage

1. **Upload File or Paste Text**
   - Click "Upload File" tab to drag & drop .txt or .docx files
   - Or click "Paste Text" tab to copy/paste transcript content

2. **Adjust AI Parameters (Optional)**
   - Temperature: Control creativity (0-1)
   - Top P: Control diversity (0-1)
   - Frequency Penalty: Reduce repetition (-2 to 2)
   - Presence Penalty: Encourage new topics (-2 to 2)

3. **Generate Summary**
   - Click "Generate Summary" button
   - Wait for processing...

4. **View Results**
   - Action points displayed as numbered list
   - Strategic recommendations provided
   - Download button to export as text file

---

## 🎯 Supported File Formats

- **.txt** - Plain text files (UTF-8 or ISO-8859-1)
- **.docx** - Microsoft Word documents

---

## 🚀 Deploy to Vercel

**This is the easiest part!**

See [VERCEL_SIMPLE.md](VERCEL_SIMPLE.md) for complete deployment instructions.

**Quick version:**
1. Push code to GitHub
2. Go to https://vercel.com/dashboard
3. Click "Add New" → "Project" → import your repository
4. Add environment variables (OPENAI_API_KEY, JWT_SECRET)
5. Done! Your app is live ✨

---

## 🔧 Configuration

### Add New Users

Edit `app/api/utils/auth-db.ts`:

```typescript
const USERS_DB = {
  'your@email.com': {
    id: 'user_001',
    email: 'your@email.com',
    password: 'your-password',
  },
};
```

**Note:** For production, implement proper password hashing and registration.

### Change UI Colors

Edit `app/globals.css` CSS variables:

```css
:root {
  --primary: 221.2 83.2% 53.3%;      /* Primary color (blue) */
  --secondary: 217.2 32.6% 17.5%;    /* Secondary color (dark blue) */
  /* ... other variables ... */
}
```

### Adjust AI Prompts

Edit `app/api/utils/openai-processor.ts`:

```typescript
const actionPointsPrompt = "Extract the main action points...";
const recommendationsPrompt = "Based on this transcript, provide...";
```

---

## 📁 Project Structure

```
igs-summariser/
├── app/
│   ├── api/
│   │   ├── login/route.ts           # Login API
│   │   ├── summary/route.ts         # Summary processing API
│   │   ├── health/route.ts          # Health check
│   │   └── utils/                   # Helper functions
│   │       ├── file-processor.ts
│   │       ├── openai-processor.ts
│   │       ├── auth-db.ts
│   │       └── jwt.ts
│   ├── dashboard/page.tsx            # Main dashboard
│   ├── page.tsx                      # Login page
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
├── components/
│   ├── ui/                          # Base UI components
│   ├── logo.tsx
│   ├── dashboard-header.tsx
│   ├── summary-results.tsx
│   ├── parameter-controls.tsx
│   ├── file-upload-zone.tsx
│   └── ...
├── lib/
│   ├── auth-store.ts               # State management
│   └── api-client.ts               # API client
├── public/                          # Static assets
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.example
```

---

## 🔐 Environment Variables

Create `.env.local` with:

```env
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-your-api-key-here

# Required: Random secret for JWT tokens
JWT_SECRET=your-random-secret-key
```

**Generate JWT_SECRET:**

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

---

## 📡 API Endpoints

### POST `/api/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "demo@example.com",
  "password": "demo123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": "user_001",
  "email": "demo@example.com"
}
```

### POST `/api/summary`
Process transcript and generate summary.

**Headers:**
```
Authorization: Bearer {token}
```

**Body:** (multipart/form-data)
- `file` or `transcript` (required)
- `temperature` (optional, default: 0.7)
- `top_p` (optional, default: 0.9)
- `frequency_penalty` (optional, default: 0.5)
- `presence_penalty` (optional, default: 0.5)

**Response:**
```json
{
  "action_points": ["Point 1", "Point 2", "Point 3"],
  "recommendations": "Detailed recommendations..."
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## 🧪 Testing

### Local Testing
1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Login with demo credentials
4. Test file upload or text paste
5. Check browser console (F12) for any errors

### Production Testing
1. Open your Vercel URL
2. Repeat steps 3-5 above
3. If it works locally but not on Vercel:
   - Check Vercel logs
   - Verify environment variables are set
   - Check OpenAI API key is valid

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **API key error** | Verify `OPENAI_API_KEY` in `.env.local` starts with `sk-` |
| **Login fails** | Check credentials in `app/api/utils/auth-db.ts` |
| **File upload not working** | Ensure file is .txt or .docx, not corrupted |
| **Build fails locally** | Run `npm install`, check Node version 18+ |
| **Not connecting on Vercel** | Check environment variables in Vercel dashboard |
| **OpenAI rate limit** | Check usage at https://platform.openai.com/account/usage |

---

## 📊 How It Works

1. **User Login**
   - Frontend sends email/password to `/api/login`
   - Backend verifies credentials
   - Returns JWT token
   - Token stored in localStorage

2. **File Processing**
   - User uploads file or pastes text
   - Frontend sends to `/api/summary` with JWT token
   - Backend:
     - Verifies token
     - Parses file (mammoth for .docx, text for .txt)
     - Chunks text if needed (for large documents)
     - Sends to OpenAI API
     - Returns results

3. **Results Display**
   - Frontend displays action points (numbered list)
   - Shows recommendations
   - Allows download as text file

---

## 💰 Costs

| Service | Cost |
|---------|------|
| **Vercel (Frontend)** | Free tier included |
| **OpenAI API** | $0-500+ (pay per token) |
| **Custom Domain** | $10-15/year (optional) |
| **Total** | ~$0-50/month |

---

## 📚 Documentation

- [VERCEL_SIMPLE.md](VERCEL_SIMPLE.md) - ⭐ Deployment guide
- [QUICKSTART.md](QUICKSTART.md) - Quick reference
- [FRONTEND_ONLY_CHANGES.md](FRONTEND_ONLY_CHANGES.md) - What changed from original
- [PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md) - Implementation checklist

---

## 🎯 Next Steps

1. **Local Development**: `npm install && npm run dev`
2. **Test Features**: Login and try file processing
3. **Deploy**: Follow [VERCEL_SIMPLE.md](VERCEL_SIMPLE.md)
4. **Share**: Give your Vercel URL to users
5. **Monitor**: Check Vercel logs and OpenAI usage

---

## ✅ What's Included

✅ Complete Next.js application
✅ API routes for all functionality
✅ Beautiful, responsive UI
✅ JWT authentication
✅ File processing (.txt and .docx)
✅ OpenAI integration
✅ Parameter controls
✅ Results export
✅ Comprehensive documentation
✅ Ready to deploy

---

## 🎉 You're Ready!

Everything is set up and ready to use. Start with:

```bash
npm install
npm run dev
```

Then deploy to Vercel when ready!

For questions, refer to the documentation files. Happy coding! 🚀
