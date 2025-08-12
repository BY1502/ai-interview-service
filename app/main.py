# from fastapi import FastAPI
# from app.core.config import settings
# from app.api import router as api_router

# app = FastAPI(title=settings.APP_NAME)

# @app.get("/health")
# def health():
#     return {"status": "ok"}

# app.include_router(api_router, prefix="/api")

# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import router as api_router

app = FastAPI(title=settings.APP_NAME)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",  # 프론트엔드 주소
]

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 로컬 데모 편의상 전체 허용 (배포 시 도메인 제한 권장)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(api_router, prefix="/api")
