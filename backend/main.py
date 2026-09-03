from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from pydantic import BaseModel
import os
import re
import tempfile
from datetime import datetime, timedelta
from typing import List
import jwt
from docx import Document
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-this")

app = FastAPI(title="IGS Summariser API", version="1.0.0")

# CORS Configuration - Allow Vercel domains and localhost
cors_origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]

# Add production domain if specified
if os.getenv("ALLOWED_ORIGINS"):
    cors_origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))
else:
    # Default: allow all for development
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Database of users (in production, use a real database)
USERS_DB = {
    "demo@example.com": {
        "password": "demo123",
        "id": "user_001",
    }
}

# ============ Models ============
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user_id: str
    email: str

class SummaryResponse(BaseModel):
    action_points: List[str]
    recommendations: str

# ============ Auth Functions ============
def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# ============ File Processing Functions ============
def read_file(file: UploadFile) -> str:
    """Read content from uploaded file"""
    if file.filename.endswith(".txt"):
        try:
            content = file.file.read().decode("utf-8")
        except UnicodeDecodeError:
            file.file.seek(0)
            content = file.file.read().decode("ISO-8859-1")
    elif file.filename.endswith(".docx"):
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name
        doc = Document(tmp_path)
        content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        os.unlink(tmp_path)
    else:
        raise ValueError("Unsupported file type")
    return content

def chunk_text(text: str, max_tokens: int = 80000) -> List[str]:
    """Chunk text into manageable parts"""
    words = text.split()
    chunks = []
    current_chunk = []
    current_tokens = 0

    for word in words:
        current_tokens += len(word) // 4
        current_chunk.append(word)
        
        if current_tokens >= max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_tokens = 0

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def openai_prompt(
    prompt: str,
    temperature: float,
    top_p: float,
    frequency_penalty: float,
    presence_penalty: float
) -> str:
    """Generate response from OpenAI"""
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are the best business coach summary transcriber."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000,
        temperature=temperature,
        top_p=top_p,
        frequency_penalty=frequency_penalty,
        presence_penalty=presence_penalty
    )
    return response.choices[0].message.content.strip()

def process_chunks(
    transcript: str,
    prompt_text: str,
    temperature: float,
    top_p: float,
    frequency_penalty: float,
    presence_penalty: float
) -> str:
    """Process each chunk"""
    chunks = chunk_text(transcript)
    results = []
    for chunk in chunks:
        prompt = f"{prompt_text}\n\n{chunk}"
        result = openai_prompt(prompt, temperature, top_p, frequency_penalty, presence_penalty)
        results.append(result)
    return " ".join(results)

def clean_text(text: str) -> str:
    """Clean Markdown-style formatting"""
    clean = re.sub(r"[#\*\-]+", "", text)
    clean = re.sub(r"\n\s*\n", "\n", clean)
    return clean.strip()

def generate_summary(
    transcript: str,
    temperature: float = 0.7,
    top_p: float = 0.9,
    frequency_penalty: float = 0.5,
    presence_penalty: float = 0.5
) -> tuple:
    """Generate summary from transcript"""
    action_points_prompt = "Extract the main action points and key decisions from this transcript in a clear, concise format:"
    recommendations_prompt = "Based on this transcript, provide strategic recommendations for improvement:"
    
    main_points = process_chunks(
        transcript,
        action_points_prompt,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty
    ).splitlines()

    recommendations = process_chunks(
        transcript,
        recommendations_prompt,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty
    )

    main_points = [clean_text(point) for point in main_points if clean_text(point)]
    recommendations = clean_text(recommendations)

    return main_points, recommendations

# ============ API Endpoints ============
@app.post("/api/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login endpoint"""
    user = USERS_DB.get(request.email)
    
    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_token(user["id"], request.email)
    return LoginResponse(token=token, user_id=user["id"], email=request.email)

@app.post("/api/summary", response_model=SummaryResponse)
async def summary(
    file: UploadFile = File(None),
    transcript: str = Form(None),
    temperature: float = Form(0.7),
    top_p: float = Form(0.9),
    frequency_penalty: float = Form(0.5),
    presence_penalty: float = Form(0.5),
    credentials: HTTPAuthCredentials = Depends(security)
):
    """Process transcript and generate summary"""
    # Verify token
    payload = verify_token(credentials)
    
    # Get transcript content
    if file:
        content = read_file(file)
    elif transcript:
        content = transcript
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either file or transcript content is required"
        )
    
    if not content or len(content.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript content is too short"
        )
    
    # Generate summary
    try:
        action_points, recommendations = generate_summary(
            content,
            temperature=temperature,
            top_p=top_p,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty
        )
        return SummaryResponse(action_points=action_points, recommendations=recommendations)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing summary: {str(e)}"
        )

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(app, host=host, port=port)
