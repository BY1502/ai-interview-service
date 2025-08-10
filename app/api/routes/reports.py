from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session as OrmSession
from typing import List, Dict, Any

from app.db.session import SessionLocal
from app.db import models as m
from app.services.report_llm import generate_report

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _collect_session_payload(db: OrmSession, session_id: int) -> Dict[str, Any]:
    s = db.get(m.Session, session_id)
    if not s:
        raise HTTPException(404, "Session not found")

    # Q/A + Analytics 모으기
    q_rows: List[m.Question] = db.query(m.Question).filter(m.Question.session_id == s.id).all()
    qids = [q.id for q in q_rows]
    # answers 중 가장 최신(질문당 1개 가정이 아니므로 우선 전체 수집)
    a_rows = db.query(m.Answer).filter(m.Answer.question_id.in_(qids)).all()
    a_map = {}
    for a in a_rows:
        # 질문당 마지막 답변으로 갱신
        a_map[a.question_id] = a
    payload_qas = []
    for q in q_rows:
        a = a_map.get(q.id)
        if not a:
            continue
        an = db.query(m.Analytics).filter(m.Analytics.answer_id == a.id).first()
        payload_qas.append({
            "question": q.text,
            "rubric_keywords": q.rubric_keywords,
            "answer": a.transcript,
            "analytics": {
                "filler_ratio": getattr(an, "filler_ratio", 0.0),
                "wpm": getattr(an, "wpm", 0.0),
                "sentiment": getattr(an, "sentiment", "neu"),
                "keyword_hit_rate": getattr(an, "keyword_hit_rate", 0.0),
                "clarity_score": getattr(an, "clarity_score", 2.5),
                "coherence_score": getattr(an, "coherence_score", 2.5),
            }
        })

    return {
        "session": {
            "id": s.id,
            "role": s.role,
            "job_title": s.job_title,
            "level": s.level,
            "difficulty": s.difficulty,
            "created_at": s.created_at.isoformat(),
        },
        "qas": payload_qas,
    }

@router.post("/sessions/{session_id}/report", summary="Generate & save final report")
def create_report(session_id: int, db: OrmSession = Depends(get_db)):
    payload = _collect_session_payload(db, session_id)
    if not payload["qas"]:
        raise HTTPException(400, "No answers found for this session")

    data = generate_report(payload)
    rep = m.Report(
        session_id=session_id,
        total_score=data.get("total_score", 0.0),
        summary_md=data.get("summary_md", "## 요약\n- 데이터 부족"),
        suggestions_md=data.get("suggestions_md", "## 다음 연습 질문\n- 데이터 부족"),
    )
    # upsert 형태(세션당 1개)
    old = db.query(m.Report).filter(m.Report.session_id == session_id).first()
    if old:
        old.total_score = rep.total_score
        old.summary_md = rep.summary_md
        old.suggestions_md = rep.suggestions_md
        db.commit()
        db.refresh(old)
        return {"session_id": session_id, "report_id": old.id, "total_score": old.total_score}

    db.add(rep); db.commit(); db.refresh(rep)
    return {"session_id": session_id, "report_id": rep.id, "total_score": rep.total_score}

@router.get("/sessions/{session_id}/report", summary="Get final report")
def get_report(session_id: int, db: OrmSession = Depends(get_db)):
    rep = db.query(m.Report).filter(m.Report.session_id == session_id).first()
    if not rep:
        raise HTTPException(404, "Report not found")
    return {
        "session_id": session_id,
        "total_score": rep.total_score,
        "summary_md": rep.summary_md,
        "suggestions_md": rep.suggestions_md,
        "created_at": rep.created_at.isoformat(),
    }
