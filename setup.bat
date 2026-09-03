@echo off
REM Setup script for IGS Summariser on Windows

echo 🚀 Setting up IGS Summariser...

REM Create virtual environment for Python
echo 📦 Creating Python virtual environment...
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install -r backend/requirements.txt

REM Install Node dependencies
echo 📦 Installing Node dependencies...
npm install

REM Create .env files from examples
echo 📝 Creating .env files...
if not exist .env.local (
    copy .env.example .env.local
    echo ✅ Created .env.local ^(please update with your API keys^)
)

if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env ^(please update with your API keys^)
)

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Update .env.local with NEXT_PUBLIC_API_URL
echo 2. Update backend\.env with OPENAI_API_KEY and JWT_SECRET
echo 3. Run 'npm run dev' to start the frontend
echo 4. Run 'python backend/main.py' in another terminal to start the backend
echo.
