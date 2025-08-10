# app/api/routes/sessions.py
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session as OrmSession

from app.services.llm import generate_questions
from app.db.session import SessionLocal
from app.db import models as m
from app.core.auth import current_user_id  # ✅ 로그인 사용자 확인

router = APIRouter()

# ✅ 회사명(company) 필드 추가
class SessionCreate(BaseModel):
    role: str = Field(..., examples=["backend", "data", "ml"])
    job_title: str = Field(..., examples=["Backend Engineer", "ML Engineer"])
    level: str = Field("junior", examples=["junior", "mid", "senior"])
    stack: List[str] = []
    difficulty: str = Field("medium", examples=["easy", "medium", "hard"])
    company: str = Field("", examples=["Acme Corp", "Naver", "Kakao"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --------------------------------------------
# 1) 세션 생성 + 예상 질문 생성 (로그인 필요)
# POST /api/sessions
# --------------------------------------------
@router.post("", summary="Create a session & generate interview questions")
def create_session(
    payload: SessionCreate,
    request: Request,
    db: OrmSession = Depends(get_db),
):
    # ✅ 로그인 사용자 확인
    uid = current_user_id(request)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    # 1) 세션 저장 (회사명 + user_id 포함)
    s = m.Session(
        role=payload.role,
        job_title=payload.job_title,
        level=payload.level,
        difficulty=payload.difficulty,
        user_id=uid,                # ✅ 소유자
        company=(payload.company or "").strip(),  # ✅ 회사명
        # 선택: 스키마에 stack 컬럼이 있다면 아래 같이 저장
        # stack=",".join(payload.stack),
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    # 2) 질문 생성
    questions = generate_questions(
        role=payload.role,
        job_title=payload.job_title,
        level=payload.level,
        stack=payload.stack,
        difficulty=payload.difficulty,
    )

    # 3) 질문 저장
    for q in questions:
        db.add(m.Question(
            session_id=s.id,
            text=q["text"],
            rubric_keywords=",".join(q["rubric_keywords"]),
            difficulty=q["difficulty"],
        ))
    db.commit()

    return {"session_id": s.id, "questions": questions}

# --------------------------------------------
# 2) 내 세션 목록 조회(회사 필터 가능)
# GET /api/sessions/mine?company=Kakao
# --------------------------------------------
@router.get("/mine", summary="List my sessions (optionally filter by company)")
def list_my_sessions(
    request: Request,
    company: Optional[str] = Query(None, description="회사명 필터"),
    db: OrmSession = Depends(get_db),
):
    uid = current_user_id(request)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    q = db.query(m.Session).filter(m.Session.user_id == uid).order_by(m.Session.created_at.desc())
    if company:
        q = q.filter(m.Session.company == company)

    rows = q.all()
    return [
        {
            "id": r.id,
            "company": r.company,
            "role": r.role,
            "job_title": r.job_title,
            "level": r.level,
            "difficulty": r.difficulty,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]

# --------------------------------------------
# 3) 세션 상세 조회(기존 있으면 유지)
# GET /api/sessions/{session_id}
#  - 본인 세션만 접근 가능하게 보호
# --------------------------------------------
@router.get("/{session_id}", summary="Get a session with its questions")
def get_session(
    session_id: int,
    request: Request,
    db: OrmSession = Depends(get_db),
):
    uid = current_user_id(request)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    s = db.get(m.Session, session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    if s.user_id and s.user_id != uid:
        raise HTTPException(403, "forbidden")

    # 질문 포함해서 반환
    qs = db.query(m.Question).filter(m.Question.session_id == session_id).all()
    return {
        "id": s.id,
        "company": s.company,
        "role": s.role,
        "job_title": s.job_title,
        "level": s.level,
        "difficulty": s.difficulty,
        "created_at": s.created_at.isoformat(),
        "questions": [
            {
                "id": q.id,
                "text": q.text,
                "rubric_keywords": q.rubric_keywords,
                "difficulty": q.difficulty,
            } for q in qs
        ],
    }
