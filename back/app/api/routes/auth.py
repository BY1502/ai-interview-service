from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as OrmSession
from app.db.session import SessionLocal
from app.db import models as m
from app.core.auth import hash_pw, verify_pw, make_tokens, set_auth_cookies, clear_auth, current_user_id

router = APIRouter()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.post("/auth/signup")
def signup(payload: dict, db: OrmSession = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    pw = payload.get("password") or ""
    if not email or not pw: raise HTTPException(400, "email/password required")
    if db.query(m.User).filter(m.User.email == email).first():
        raise HTTPException(409, "email already exists")
    u = m.User(email=email, password_hash=hash_pw(pw))
    db.add(u); db.commit(); db.refresh(u)
    return {"ok": True}

@router.post("/auth/login")
def login(payload: dict, db: OrmSession = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    pw = payload.get("password") or ""
    u = db.query(m.User).filter(m.User.email == email).first()
    if not u or not verify_pw(pw, u.password_hash):
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다")
    access, refresh = make_tokens(u.id)
    resp = JSONResponse({"ok": True})
    set_auth_cookies(resp, access, refresh)
    return resp

@router.post("/auth/logout")
def logout():
    resp = JSONResponse({"ok": True})
    clear_auth(resp)
    return resp

@router.get("/me")
def me(request: Request, db: OrmSession = Depends(get_db)):
    uid = current_user_id(request)
    if not uid: raise HTTPException(401, "unauthorized")
    u = db.get(m.User, uid)
    return {"id": u.id, "email": u.email}
