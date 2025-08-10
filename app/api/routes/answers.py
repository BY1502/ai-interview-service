from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session as OrmSession

from app.db.session import SessionLocal
from app.db import models as m
from app.services.analyze import analyze

router = APIRouter()

class AnswerCreate(BaseModel):
    question_id: int
    type: str = Field("text", pattern="^(text|audio)$")
    transcript: str
    duration_sec: Optional[float] = 0.0

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", summary="Submit an answer (text/audio) and run basic analysis")
def create_answer(payload: AnswerCreate, db: OrmSession = Depends(get_db)):
    q = db.get(m.Question, payload.question_id)
    if not q:
        raise HTTPException(404, "Question not found")

    a = m.Answer(
        question_id=q.id,
        type=payload.type,
        transcript=payload.transcript,
        duration_sec=payload.duration_sec or 0.0,
    )
    db.add(a); db.commit(); db.refresh(a)

    rubric_keywords = [s.strip() for s in (q.rubric_keywords or "").split(",") if s.strip()]
    result = analyze(a.transcript, rubric_keywords, a.duration_sec)

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
    return {"answer_id": a.id, "analytics": result}

@router.get("/{answer_id}/analytics", summary="Get analytics for an answer")
def get_analytics(answer_id: int, db: OrmSession = Depends(get_db)):
    an = db.query(m.Analytics).filter(m.Analytics.answer_id == answer_id).first()
    if not an:
        raise HTTPException(404, "Analytics not found")
    return {
        "answer_id": answer_id,
        "filler_ratio": an.filler_ratio,
        "wpm": an.wpm,
        "sentiment": an.sentiment,
        "keyword_hit_rate": an.keyword_hit_rate,
        "clarity_score": an.clarity_score,
        "coherence_score": an.coherence_score,
        "created_at": an.created_at.isoformat(),
    }
