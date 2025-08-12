import os, datetime, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, Request
from fastapi.responses import Response

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.getenv("JWT_SECRET", "dev-secret")
ALGO = "HS256"
ACCESS_MIN = 15
REFRESH_DAYS = 7

def hash_pw(p): return pwd.hash(p)
def verify_pw(p, h): return pwd.verify(p, h)

def make_tokens(user_id: int):
    now = datetime.datetime.utcnow()
    access = jwt.encode({"sub": str(user_id), "exp": now + datetime.timedelta(minutes=ACCESS_MIN)}, SECRET, algorithm=ALGO)
    refresh = jwt.encode({"sub": str(user_id), "exp": now + datetime.timedelta(days=REFRESH_DAYS)}, SECRET, algorithm=ALGO)
    return access, refresh

def set_auth_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, samesite="Lax")
    resp.set_cookie("refresh_token", refresh, httponly=True, samesite="Lax")

def clear_auth(resp: Response):
    resp.delete_cookie("access_token"); resp.delete_cookie("refresh_token")

def current_user_id(request: Request) -> int | None:
    tok = request.cookies.get("access_token")
    if not tok: return None
    try:
        data = jwt.decode(tok, SECRET, algorithms=[ALGO])
        return int(data["sub"])
    except Exception as e:
        import logging; logging.getLogger("auth").exception("JWT decode failed: %s", e)
        return None
