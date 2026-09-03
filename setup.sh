#!/bin/bash
# Setup script for IGS Summariser

echo "🚀 Setting up IGS Summariser..."

# Create virtual environment for Python
echo "📦 Creating Python virtual environment..."
python -m venv venv

# Activate virtual environment (for bash/zsh)
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r backend/requirements.txt

# Install Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Create .env files from examples
echo "📝 Creating .env files..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local (please update with your API keys)"
fi

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env (please update with your API keys)"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env.local with NEXT_PUBLIC_API_URL"
echo "2. Update backend/.env with OPENAI_API_KEY and JWT_SECRET"
echo "3. Run 'npm run dev' to start the frontend"
echo "4. Run 'python backend/main.py' in another terminal to start the backend"
echo ""
