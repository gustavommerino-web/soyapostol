"""JWT email/password authentication."""
import os
import bcrypt
import hashlib
import jwt
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

JWT_ALGORITHM = "HS256"
PASSWORD_RESET_TTL_MINUTES = 60
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
               "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id,
               "exp": datetime.now(timezone.utc) + timedelta(days=7),
               "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def _cookie_flags(request: Optional[Request] = None) -> dict:
    """Cookie flags suitable for the current environment.
    Auto-detects production (HTTPS) vs local dev (HTTP) from the incoming
    request's scheme (respecting X-Forwarded-Proto from k8s/ingress).
    Env vars COOKIE_SECURE / COOKIE_SAMESITE override auto-detection if set.
    """
    env_secure = os.environ.get("COOKIE_SECURE")
    if env_secure is not None:
        secure = env_secure.lower() in ("true", "1", "yes")
    elif request is not None:
        scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
        secure = scheme == "https"
    else:
        secure = False
    # SameSite=None is required for cross-domain cookies (frontend at soyapostol.org
    # talking to backend at apostol-sacred.emergent.host); lax is fine for same-origin.
    samesite = os.environ.get("COOKIE_SAMESITE", "none" if secure else "lax").lower()
    return {"httponly": True, "secure": secure, "samesite": samesite, "path": "/"}


def set_auth_cookies(response: Response, access: str, refresh: str, request: Optional[Request] = None):
    flags = _cookie_flags(request)
    response.set_cookie("access_token", access, max_age=3600, **flags)
    response.set_cookie("refresh_token", refresh, max_age=604800, **flags)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _user_public(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name") or user["email"].split("@")[0],
        "role": user.get("role", "user"),
    }


async def get_db(request: Request):
    return request.app.state.db


async def get_current_user(request: Request) -> dict:
    db = request.app.state.db
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register")
async def register(data: RegisterIn, response: Response, request: Request):
    db = request.app.state.db
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name or email.split("@")[0],
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh, request)
    return {"id": user_id, "email": email, "name": doc["name"], "role": "user"}


@router.post("/login")
async def login(data: LoginIn, response: Response, request: Request):
    db = request.app.state.db
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    attempt_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempt_doc and attempt_doc.get("count", 0) >= 5:
        lockout_until = attempt_doc.get("lockout_until")
        if lockout_until and datetime.fromisoformat(lockout_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1},
             "$set": {"lockout_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh, request)
    return _user_public(user)


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _user_public(user)


@router.post("/logout")
async def logout(response: Response, request: Request):
    flags = _cookie_flags(request)
    # Overwrite with immediate expiry, using the exact same flags the cookie was set with.
    response.set_cookie("access_token", "", max_age=0, **flags)
    response.set_cookie("refresh_token", "", max_age=0, **flags)
    return {"ok": True}


@router.post("/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await request.app.state.db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, max_age=3600, **_cookie_flags(request))
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


async def ensure_indexes(db):
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.favorites.create_index([("user_id", 1), ("created_at", -1)])
    await db.password_resets.create_index("token_hash", unique=True)
    # TTL: MongoDB will auto-delete expired tokens.
    await db.password_resets.create_index("expires_at", expireAfterSeconds=0)


# ---------- Password reset ----------

class ForgotPasswordIn(BaseModel):
    email: EmailStr
    lang: Optional[str] = "es"


class ResetPasswordIn(BaseModel):
    token: str = Field(..., min_length=20, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordIn, request: Request):
    """Issue a password-reset token and email the link via Resend. The
    response is deliberately uniform whether or not the email exists so we
    don't leak account existence to attackers."""
    from email_service import send_password_reset_email  # local import avoids cycles
    db = request.app.state.db
    email = data.email.lower()
    lang = data.lang if data.lang in ("es", "en") else "es"
    user = await db.users.find_one({"email": email})

    generic_ok = {"ok": True,
                  "message": "If the email exists, a reset link has been issued."}

    if not user:
        return generic_ok

    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES)

    # Invalidate prior tokens for this user, then store the new one (hashed).
    await db.password_resets.delete_many({"user_id": str(user["_id"])})
    await db.password_resets.insert_one({
        "user_id": str(user["_id"]),
        "token_hash": _hash_token(raw_token),
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    # Build the public reset URL — prefer the caller's origin so the link
    # works correctly whether the request came from preview, prod, or a
    # local dev host. Fall back to an env-configured APP_PUBLIC_URL.
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        # Strip trailing path from referer to keep just the host.
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        base = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else origin
    else:
        base = os.environ.get("APP_PUBLIC_URL", "https://soyapostol.org")
    reset_url = f"{base.rstrip('/')}/reset-password?token={raw_token}"

    # Send via Resend (non-blocking). Failures are logged but the endpoint
    # still succeeds — the token is persisted, so retries / alternative
    # channels (e.g. SMS) can reuse it.
    await send_password_reset_email(
        to_email=email,
        reset_url=reset_url,
        ttl_minutes=PASSWORD_RESET_TTL_MINUTES,
        lang=lang,
    )

    return generic_ok


@router.post("/reset-password")
async def reset_password(data: ResetPasswordIn, request: Request):
    db = request.app.state.db
    record = await db.password_resets.find_one({"token_hash": _hash_token(data.token)})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    expires_at = record.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at <= datetime.now(timezone.utc):
        await db.password_resets.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {"password_hash": hash_password(data.new_password)}},
    )
    # Single-use: drop the token immediately.
    await db.password_resets.delete_one({"_id": record["_id"]})
    # Reset any brute-force counters this user might have accumulated.
    user = await db.users.find_one({"_id": ObjectId(record["user_id"])})
    if user:
        await db.login_attempts.delete_many({"identifier": {"$regex": f":{user['email']}$"}})
    return {"ok": True}


# ---------- Account deletion ----------

class DeleteAccountIn(BaseModel):
    confirm_email: EmailStr
    lang: Optional[str] = "es"


@router.post("/delete-account")
async def delete_account(
    data: DeleteAccountIn,
    response: Response,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Permanently delete the current user and all their associated data.

    Confirmation: the caller must send `confirm_email` matching the email
    on the user's record (case-insensitive). Mismatches return 400 without
    side effects.

    Scope of deletion (anything keyed by user_id):
      * user document (users)
      * favorites
      * pending password-reset tokens
      * brute-force counters keyed by this email

    Caches that don't reference user_id (readings_cache, liturgy_cache,
    news_cache, prayers_*, bible_cache, catechism_cache) are intentionally
    untouched — they're public content shared across all users.

    A best-effort farewell email is sent via Resend before clearing the
    auth cookies.
    """
    db = request.app.state.db
    if data.confirm_email.lower() != user["email"].lower():
        raise HTTPException(status_code=400, detail="Confirmation email does not match.")

    user_id = str(user["_id"])
    email = user["email"]
    name = user.get("name") or email.split("@")[0]
    lang = data.lang if data.lang in ("es", "en") else "es"

    # 1. Remove personal data.
    await db.favorites.delete_many({"user_id": user_id})
    await db.password_resets.delete_many({"user_id": user_id})
    # login_attempts identifier is "ip:email" — match by suffix.
    await db.login_attempts.delete_many({"identifier": {"$regex": f":{email}$"}})

    # 2. Delete the user document itself.
    await db.users.delete_one({"_id": user["_id"]})

    # 3. Best-effort farewell email (never blocks the response).
    try:
        from email_service import send_account_deleted_email
        await send_account_deleted_email(to_email=email, name=name, lang=lang)
    except Exception as e:  # noqa: BLE001
        logger.error("Farewell email failed for %s: %s", email, e)

    # 4. Wipe auth cookies on the response so the SPA falls back to logged-out state.
    flags = _cookie_flags(request)
    response.set_cookie("access_token", "", max_age=0, **flags)
    response.set_cookie("refresh_token", "", max_age=0, **flags)
    return {"ok": True}





async def seed_admin(db):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@apostol.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Apostol2026!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
