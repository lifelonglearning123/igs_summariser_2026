# Quick Start Guide

## 📋 Prerequisites

- Node.js 18.0 or higher
- Python 3.9 or higher
- pip (Python package manager)
- An OpenAI API key (get it from https://platform.openai.com/api-keys)

## 🚀 Quick Setup (Windows)

### Step 1: Run the Setup Script
```bash
setup.bat
```

This will:
- Create a Python virtual environment
- Install Python dependencies
- Install Node.js dependencies
- Create `.env.local` and `backend/.env` files

### Step 2: Configure Environment Variables

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
JWT_SECRET=your-secret-key
```

**Backend (backend/.env):**
```
OPENAI_API_KEY=sk-your-actual-api-key-here
JWT_SECRET=your-secret-key
```

### Step 3: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```
✅ Backend will run on http://localhost:8000

**Terminal 2 - Frontend:**
```bash
npm run dev
```
✅ Frontend will run on http://localhost:3000

## 🔐 Login

Open http://localhost:3000 and use:
- **Email:** demo@example.com
- **Password:** demo123

## 🎯 Testing the Application

### 1. File Upload Test
- Click "Upload File" tab
- Drag and drop a .txt or .docx file with meeting notes/transcript
- The system should accept files and show the filename

### 2. Text Paste Test
- Click "Paste Text" tab
- Paste transcript content
- Click "Generate Summary"

### 3. Parameter Adjustment
- Adjust the sliders on the right panel:
  - Temperature: How creative the AI response should be
  - Top P: Diversity of token selection
  - Frequency Penalty: Reduce repetition
  - Presence Penalty: Encourage new topics

### 4. Results Generation
- After processing, you should see:
  - Action Points: Numbered list of key items
  - Recommendations: Strategic suggestions based on transcript
  - Download button to export results

### 5. Logout Test
- Click your email in the top-right
- Click "Logout" button
- Should redirect to login page

## 📁 Project Structure

```
├── app/                      # Next.js application
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Login page
│   ├── dashboard/
│   │   └── page.tsx         # Dashboard page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Base components
│   ├── logo.tsx
│   ├── dashboard-header.tsx
│   ├── summary-results.tsx
│   └── ...
├── lib/                     # Utilities
│   ├── auth-store.ts       # Zustand store
│   ├── auth-context.tsx    # Auth context
│   └── api-client.ts       # API communication
├── backend/                # FastAPI backend
│   ├── main.py            # Main app
│   ├── database.py        # Models
│   └── requirements.txt
└── README.md, package.json, tsconfig.json, etc.
```

## 🛠️ Common Issues & Solutions

### Backend won't start
**Error:** `ModuleNotFoundError: No module named 'fastapi'`
**Solution:**
```bash
cd backend
pip install -r requirements.txt
```

### Frontend won't connect to backend
**Error:** Connection refused on localhost:8000
**Solution:**
1. Ensure backend is running on http://localhost:8000
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Make sure CORS is enabled in backend (it is by default)

### OpenAI API errors
**Error:** `Invalid API key provided`
**Solution:**
1. Verify your API key from https://platform.openai.com/api-keys
2. Copy the full key (starts with `sk-`)
3. Update `backend/.env` with correct key
4. Restart backend

### File upload not working
**Error:** `Unsupported file type`
**Solution:**
- Only .txt and .docx files are supported
- Check file extension
- Ensure file is not corrupted

## 📊 API Testing with cURL

### Login
```bash
curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

### Process Summary (with file)
```bash
curl -X POST "http://localhost:8000/api/summary" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@transcript.txt" \
  -F "temperature=0.7" \
  -F "top_p=0.9"
```

### Health Check
```bash
curl http://localhost:8000/health
```

## 🎨 Customization

### Adding New Users
Edit `backend/main.py`:
```python
USERS_DB = {
    "demo@example.com": {
        "password": "demo123",
        "id": "user_001",
    },
    "newuser@example.com": {
        "password": "newpassword",
        "id": "user_002",
    }
}
```

### Changing UI Colors
Edit `app/globals.css` - look for the `:root` CSS variables:
```css
--primary: 221.2 83.2% 53.3%;
--secondary: 217.2 32.6% 17.5%;
```

### Adjusting AI Prompts
Edit `backend/main.py` - look for these variables:
```python
action_points_prompt = "Your custom prompt here..."
recommendations_prompt = "Your custom prompt here..."
```

## 🚀 Production Deployment

### Build the Frontend
```bash
npm run build
npm run start
```

### Deploy Backend
```bash
# Using Gunicorn (production ASGI server)
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app
```

### Docker Deployment
```bash
docker-compose up
```

## 📞 Support

For issues:
1. Check the README.md in the root directory
2. Review error messages in browser console (F12)
3. Check backend logs in terminal
4. Verify all prerequisites are installed
5. Ensure .env files have correct values

## ✅ Next Steps

- [ ] Add more users to USERS_DB
- [ ] Set up real database (PostgreSQL)
- [ ] Implement OAuth login (Google/GitHub)
- [ ] Add user history/dashboard
- [ ] Deploy to production
- [ ] Set up monitoring and logging
