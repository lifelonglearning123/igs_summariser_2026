// This file is used to run the application
// Usage: node scripts/dev.js (for development)

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting IGS Summariser...\n');

// Start backend
console.log('📦 Starting FastAPI backend on http://localhost:8000...');
const backend = spawn('python', ['backend/main.py'], {
  cwd: __dirname,
  stdio: 'inherit',
});

// Wait for backend to start, then start frontend
setTimeout(() => {
  console.log('\n🎨 Starting Next.js frontend on http://localhost:3000...\n');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit();
  });
}, 2000);
