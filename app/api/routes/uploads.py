from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session as OrmSession
import os, uuid, shutil

from app.db.session import SessionLocal
from app.db import models as m
from app.services.stt import transcribe_audio
from app.services.analyze import analyze

router = APIRouter()
UPLOAD_DIR = "uploads/audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/audio", summary="Upload audio file → STT → save Answer → return analytics")
async def upload_audio(
    question_id: int = Form(...),
    language: str = Form("ko"),
    file: UploadFile = File(...),
    db: OrmSession = Depends(get_db),
):
    q = db.get(m.Question, question_id)
    if not q:
        raise HTTPException(404, "Question not found")

    # 1) 파일 저장
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".webm"):
        # Whisper는 ffmpeg 경유로 대부분 지원하지만, 확장자 체크는 간단히
        pass
    fname = f"{uuid.uuid4().hex}{ext or '.wav'}"
    path = os.path.join(UPLOAD_DIR, fname)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2) 전사
    try:
        transcript, duration_sec = transcribe_audio(path, language=language)
    except Exception as e:
        raise HTTPException(500, f"STT failed: {e}")

    # 3) 답변 저장
    a = m.Answer(
        question_id=q.id,
        type="audio",
        transcript=transcript,
        audio_url=path,
        duration_sec=duration_sec,
    )
    db.add(a); db.commit(); db.refresh(a)

    # 4) 분석
    rubric_keywords = [s.strip() for s in (q.rubric_keywords or "").split(",") if s.strip()]
    result = analyze(transcript, rubric_keywords, duration_sec)

    an = m.Analytics(
        answer_id=a.id,
        filler_ratio=result["filler_ratio"],
        wpm=result["wpm"],
        sentiment=result["sentiment"],
        keyword_hit_rate=result["keyword_hit_rate"],
        clarity_score=result["clarity_score"],
        coherence_score=result["coherence_score"],
    )
    db.add(an); db.commit(); db.refresh(an)

    return {
        "answer_id": a.id,
        "duration_sec": duration_sec,
        "transcript": transcript,
        "analytics": result,
        "file": fname,
    }
