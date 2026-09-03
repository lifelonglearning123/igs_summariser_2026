# API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication

All endpoints except `/api/login` require Bearer token authentication.

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## Endpoints

### 1. Login

**POST** `/api/login`

Authenticate user and receive JWT token.

#### Request Body
```json
{
  "email": "demo@example.com",
  "password": "demo123"
}
```

#### Response (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": "user_001",
  "email": "demo@example.com"
}
```

#### Error Responses
- **401 Unauthorized**: Invalid email or password
- **422 Unprocessable Entity**: Missing required fields

#### Example cURL
```bash
curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

---

### 2. Process Summary

**POST** `/api/summary`

Process a transcript file or text and generate action points and recommendations.

#### Headers
```
Authorization: Bearer {token}
```

#### Request Body (multipart/form-data)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | File | Conditional | .txt or .docx file (required if transcript is not provided) |
| transcript | String | Conditional | Plain text transcript (required if file is not provided) |
| temperature | Float | No | AI creativity (0-1, default: 0.7) |
| top_p | Float | No | Nucleus sampling (0-1, default: 0.9) |
| frequency_penalty | Float | No | Reduce repetition (-2 to 2, default: 0.5) |
| presence_penalty | Float | No | Encourage new topics (-2 to 2, default: 0.5) |

#### Response (200 OK)
```json
{
  "action_points": [
    "First action point extracted from transcript",
    "Second action point extracted from transcript",
    "Third action point extracted from transcript"
  ],
  "recommendations": "Comprehensive recommendations based on the transcript analysis..."
}
```

#### Error Responses
- **400 Bad Request**: Missing file or transcript, or transcript too short
- **401 Unauthorized**: Invalid or missing token
- **422 Unprocessable Entity**: Invalid parameter values
- **500 Internal Server Error**: OpenAI API error or processing error

#### Example cURL with File
```bash
TOKEN=$(curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}' \
  | jq -r '.token')

curl -X POST "http://localhost:8000/api/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@transcript.txt" \
  -F "temperature=0.7" \
  -F "top_p=0.9" \
  -F "frequency_penalty=0.5" \
  -F "presence_penalty=0.5"
```

#### Example cURL with Text
```bash
TOKEN="your-token-here"

curl -X POST "http://localhost:8000/api/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "transcript=Meeting notes here..." \
  -F "temperature=0.7"
```

#### Example Python with Requests
```python
import requests

# Login
login_response = requests.post(
    "http://localhost:8000/api/login",
    json={"email": "demo@example.com", "password": "demo123"}
)
token = login_response.json()["token"]

# Process file
files = {"file": open("transcript.txt", "rb")}
data = {
    "temperature": "0.7",
    "top_p": "0.9",
    "frequency_penalty": "0.5",
    "presence_penalty": "0.5"
}
headers = {"Authorization": f"Bearer {token}"}

response = requests.post(
    "http://localhost:8000/api/summary",
    files=files,
    data=data,
    headers=headers
)

print(response.json())
```

---

### 3. Health Check

**GET** `/health`

Check API server status.

#### Response (200 OK)
```json
{
  "status": "healthy"
}
```

#### Example cURL
```bash
curl http://localhost:8000/health
```

---

## Parameters Guide

### Temperature (0.0 - 1.0)
Controls randomness of responses.
- **0.0**: Deterministic, exact, consistent responses
- **0.5**: Balanced between creativity and consistency
- **1.0**: Maximum randomness, creative responses

**Recommendation**: Use 0.5-0.7 for summaries

### Top P (0.0 - 1.0)
Nucleus sampling - controls diversity of token selection.
- **0.1**: Very focused, top 10% of probable tokens
- **0.9**: More diverse, top 90% of probable tokens

**Recommendation**: Use 0.9 for variety

### Frequency Penalty (-2.0 to 2.0)
Reduces repetition of tokens.
- **-2.0**: Encourage repetition
- **0.0**: No penalty (default behavior)
- **2.0**: Maximum penalty against repetition

**Recommendation**: Use 0.5-1.0 to reduce repetition

### Presence Penalty (-2.0 to 2.0)
Encourages the model to discuss new topics.
- **-2.0**: Discourage new topics, stick to existing
- **0.0**: No penalty
- **2.0**: Strong encouragement for new topics

**Recommendation**: Use 0.5 for balanced discussion

---

## Error Handling

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify token is valid and not expired |
| 404 | Not Found | Check endpoint URL |
| 422 | Unprocessable Entity | Check data types of parameters |
| 500 | Server Error | Check backend logs, verify OpenAI API key |

### Error Response Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production use.

---

## Token Expiration

JWT tokens expire after 7 days. User must login again to get a new token.

---

## CORS Policy

The API allows requests from all origins (CORS enabled). For production, update the CORS configuration in `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
