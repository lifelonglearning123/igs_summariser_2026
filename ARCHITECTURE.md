# Architecture & Deployment Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│                      (http://localhost:3000)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Next.js 14+   │
                    │   Frontend      │
                    ├─────────────────┤
                    │ • React Pages   │
                    │ • Components    │
                    │ • Tailwind CSS  │
                    │ • Zustand Store │
                    └────────────────┬┘
                                     │ (HTTP/JSON)
                    ┌────────────────▼─────────────────┐
                    │      FastAPI Backend             │
                    │    (http://localhost:8000)       │
                    ├──────────────────────────────────┤
                    │ • Authentication (JWT)           │
                    │ • File Processing (.txt/.docx)   │
                    │ • Text Chunking                  │
                    │ • OpenAI Integration (GPT-4o)    │
                    │ • Summary Generation             │
                    └────────────────┬──────────────────┘
                                     │
                    ┌────────────────┴──────────────────┐
                    │    External Services             │
                    ├──────────────────────────────────┤
                    │ • OpenAI GPT-4o API              │
                    │ • (Future: PostgreSQL Database)  │
                    │ • (Future: Redis Cache)          │
                    └──────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (React)
- **Styling**: Tailwind CSS
- **Components**: Custom shadcn/ui-inspired components
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Authentication**: JWT (localStorage)
- **Package Manager**: npm

### Backend
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn ASGI
- **Authentication**: PyJWT
- **File Processing**: python-docx
- **AI**: OpenAI GPT-4o
- **Environment**: python-dotenv
- **Package Manager**: pip

### Infrastructure
- **Frontend Hosting**: Vercel, Netlify, or self-hosted
- **Backend Hosting**: Render, Railway, or self-hosted
- **Database** (Optional): PostgreSQL, MongoDB
- **Container**: Docker & Docker Compose

---

## Development Environment

### Local Development Setup

**Requirements:**
- Node.js 18+
- Python 3.9+
- OpenAI API Key

**Installation:**

1. **Windows:**
```bash
setup.bat
```

2. **macOS/Linux:**
```bash
bash setup.sh
```

3. **Manual:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Frontend
npm install
```

**Start Development:**

Terminal 1:
```bash
python backend/main.py
```

Terminal 2:
```bash
npm run dev
```

---

## Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```
4. Deploy automatically on push

#### Backend (Railway)
1. Connect GitHub repo to Railway
2. Set Python as service
3. Set environment variables:
   ```
   OPENAI_API_KEY=sk-...
   JWT_SECRET=your-secret
   ```
4. Point domain to Railway

### Option 2: Docker + Self-Hosted

**Docker Compose:**
```bash
docker-compose up
```

**Environment variables (.env):**
```env
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret
DATABASE_URL=postgresql://user:pass@db:5432/igs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Option 3: Traditional Hosting

**Frontend (Netlify, Vercel, or Web Host):**
```bash
npm run build
# Deploy the .next and public directories
```

**Backend (Python Hosting):**
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app
```

---

## Production Checklist

### Security
- [ ] Change JWT_SECRET to a long random string
- [ ] Set OPENAI_API_KEY as environment variable (never in code)
- [ ] Enable HTTPS/SSL certificates
- [ ] Restrict CORS origins to your domain
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Hash and salt passwords (for future DB integration)

### Performance
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Cache frequently used responses
- [ ] Optimize database queries (future)
- [ ] Set up monitoring and alerts

### Database (Future)
- [ ] Migrate to PostgreSQL
- [ ] Set up backup strategy
- [ ] Create indexes on frequently queried columns
- [ ] Implement connection pooling

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor API response times
- [ ] Track OpenAI API usage and costs
- [ ] Set up uptime monitoring
- [ ] Configure logging

### Documentation
- [ ] Update API documentation
- [ ] Create user manual
- [ ] Document deployment procedure
- [ ] Create troubleshooting guide

---

## Database Integration (Optional)

Replace the in-memory USERS_DB with PostgreSQL:

```bash
pip install sqlalchemy psycopg2-binary alembic
```

Create SQLAlchemy models in `backend/models.py`:
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Summary(Base):
    __tablename__ = "summaries"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    filename = Column(String)
    action_points = Column(JSON)
    recommendations = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## Scaling Considerations

### Frontend Scaling
- Use Next.js ISR (Incremental Static Regeneration)
- Implement service workers for offline support
- Use image optimization
- Lazy load components

### Backend Scaling
- Implement caching (Redis)
- Use task queues (Celery) for long-running tasks
- Scale horizontally with load balancer
- Implement database connection pooling
- Use CDN for file uploads/downloads

### Cost Optimization
- Cache OpenAI API responses
- Implement request batching
- Monitor token usage
- Set up alerts for unusual API costs

---

## Monitoring & Logging

### Frontend Monitoring
```javascript
// Log errors to external service
window.addEventListener('error', (event) => {
  // Send to error tracking service (e.g., Sentry)
});
```

### Backend Logging
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/api/summary")
async def summary(...):
    logger.info(f"Processing summary for user {payload.user_id}")
    # ...
```

---

## Backup & Recovery

1. **Code**: GitHub repository (version control)
2. **Database**: Daily backups to S3
3. **Secrets**: Environment variables with backup
4. **Disaster Recovery**: Automated failover setup

---

## Cost Estimation

### Monthly Costs (Example)
- Vercel (Frontend): $20-100
- Railway (Backend): $5-50
- OpenAI API: $0-500+ (depends on usage)
- Domain: $10-15
- **Total**: ~$35-665/month

---

## Support & Maintenance

### Regular Tasks
- Monitor API usage and costs
- Update dependencies monthly
- Review and optimize performance
- Check security logs
- Backup data

### Emergency Response
- Set up monitoring alerts
- Have rollback procedure
- Maintain documentation
- Keep contact list updated
