# app/db/models.py
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base

class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role: Mapped[str] = mapped_column(String(50))
    job_title: Mapped[str] = mapped_column(String(100))
    level: Mapped[str] = mapped_column(String(50))
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    questions: Mapped[list["Question"]] = relationship(back_populates="session", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    rubric_keywords: Mapped[str] = mapped_column(Text)  # JSON 문자열로 저장(간단 버전)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")

    session: Mapped["Session"] = relationship(back_populates="questions")

class Answer(Base):
    __tablename__ = "answers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(10), default="text")  # text|audio
    transcript: Mapped[str] = mapped_column(Text)                  # STT 결과 또는 텍스트 답변
    audio_url: Mapped[str] = mapped_column(String(255), default="")# (선택) 파일 저장시 URL
    duration_sec: Mapped[float] = mapped_column(Float, default=0)  # 음성 길이(초)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    question: Mapped["Question"] = relationship()
    analytics: Mapped["Analytics"] = relationship(back_populates="answer", cascade="all, delete-orphan", uselist=False)

class Analytics(Base):
    __tablename__ = "analytics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    answer_id: Mapped[int] = mapped_column(ForeignKey("answers.id", ondelete="CASCADE"), unique=True)
    filler_ratio: Mapped[float] = mapped_column(Float)     # 0~1
    wpm: Mapped[float] = mapped_column(Float)              # words per minute(토큰/분)
    sentiment: Mapped[str] = mapped_column(String(20))     # pos|neu|neg (간단 버전)
    keyword_hit_rate: Mapped[float] = mapped_column(Float) # 0~1
    clarity_score: Mapped[float] = mapped_column(Float)    # 0~5 (간단 휴리스틱)
    coherence_score: Mapped[float] = mapped_column(Float)  # 0~5 (간단 휴리스틱)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    answer: Mapped["Answer"] = relationship(back_populates="analytics")

class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    total_score: Mapped[float] = mapped_column(Float, default=0.0)
    summary_md: Mapped[str] = mapped_column(Text)       # 최종 요약/강점/개선점 포함 마크다운
    suggestions_md: Mapped[str] = mapped_column(Text)   # 다음 연습 질문 등
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

# user_id, company
user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
company: Mapped[str] = mapped_column(String(255), default="")