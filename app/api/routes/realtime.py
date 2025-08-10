 # app/api/routes/realtime.py
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as OrmSession

from app.db.session import SessionLocal
from app.db import models as m
from app.services.analyze import analyze

router = APIRouter()

def get_db() -> OrmSession:
    return SessionLocal()

def make_tip(result: dict) -> str:
    tips = []
    if result["filler_ratio"] > 0.05:
        tips.append("충전어(음, 어)를 줄여 보세요.")
    if result["wpm"] < 80:
        tips.append("조금 더 또박또박, 핵심 키워드 중심으로 말해보세요.")
    if result["wpm"] > 220:
        tips.append("속도가 빨라요. 문장 사이 짧은 멈춤을 줘보세요.")
    if result["keyword_hit_rate"] < 0.5:
        tips.append("질문 핵심 키워드를 더 포함하세요.")
    if not tips:
        tips.append("좋아요! 이 흐름을 유지하세요.")
    return " ".join(tips[:2])

@router.websocket("/realtime/{session_id}")
async def realtime_feedback(websocket: WebSocket, session_id: int):
    await websocket.accept()
    db = get_db()
    q_cache: dict[int, list[str]] = {}  # question_id -> rubric keywords

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            # 기대 형식:
            # { "question_id": 123, "text": "현재까지 전사/타이핑 누적본", "elapsed_sec": 17.2 }
            qid = int(data["question_id"])
            text = str(data.get("text", "") or "")
            elapsed_sec = float(data.get("elapsed_sec") or 0.0)

            if qid not in q_cache:
                q = db.get(m.Question, qid)
                if not q:
                    await websocket.send_text(json.dumps({"error": "Question not found"}))
                    continue
                kws = [s.strip() for s in (q.rubric_keywords or "").split(",") if s.strip()]
                q_cache[qid] = kws

            result = analyze(text, q_cache[qid], elapsed_sec)
            payload = {
                "question_id": qid,
                "elapsed_sec": elapsed_sec,
                "metrics": result,
                "tip": make_tip(result),
            }
            await websocket.send_text(json.dumps(payload, ensure_ascii=False))

    except WebSocketDisconnect:
        pass
    finally:
        db.close()
