# Production Environment Variables

## 🚀 For Vercel (Frontend)

Set these in your Vercel project settings:

```env
NEXT_PUBLIC_API_URL=https://your-backend-api.railway.app
JWT_SECRET=your-randomly-generated-secret-key-here
```

---

## 🔧 For Railway/Render (Backend)

Set these in your backend deployment settings:

```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
JWT_SECRET=your-randomly-generated-secret-key-here
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=https://your-project.vercel.app,https://your-domain.com
```

---

## 🔐 How to Generate a Secure JWT_SECRET

### On Windows (PowerShell):
```powershell
$bytes = [byte[]]::new(32)
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

### On macOS/Linux:
```bash
openssl rand -base64 32
```

### Python:
```python
import secrets
import base64
print(base64.b64encode(secrets.token_bytes(32)).decode())
```

Copy the output and use as `JWT_SECRET` on both Vercel and backend.

---

## 📝 Template

Copy and fill in these values:

```
NEXT_PUBLIC_API_URL=https://___________
JWT_SECRET=___________
OPENAI_API_KEY=sk-___________
```

Then set them in your Vercel and backend deployment platforms.
