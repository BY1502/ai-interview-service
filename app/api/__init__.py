from fastapi import APIRouter
from .routes.sessions import router as sessions_router
from .routes.answers import router as answers_router   # 추가
from .routes.realtime import router as realtime_router   
from .routes.uploads import router as uploads_router   # ⬅ 추가
from .routes.reports import router as reports_router  # ⬅ 추가
from .routes.auth import router as auth_router

router = APIRouter()
router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])

router.include_router(answers_router, prefix="/answers", tags=["answers"])  # 추가

router.include_router(realtime_router, tags=["realtime"])  # ⬅ prefix 없이 websocket 경로 그대로 사용

router.include_router(uploads_router, prefix="/uploads", tags=["uploads"])  # ⬅ 추가

router.include_router(reports_router, tags=["reports"])  # ⬅ 추가

router.include_router(auth_router, tags=["auth"])