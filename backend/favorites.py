"""Favorites - user-scoped CRUD for any text/passage."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


class FavoriteIn(BaseModel):
    section: str  # readings | liturgy | prayers | examen | news | bible | catechism
    title: str
    content: str
    source_url: Optional[str] = None
    lang: str = "es"
    metadata: Optional[dict] = None


@router.get("")
async def list_favorites(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    user_id = str(user["_id"])
    cursor = db.favorites.find({"user_id": user_id}).sort("created_at", -1)
    items = []
    async for doc in cursor:
        items.append({
            "id": doc["id"],
            "section": doc["section"],
            "title": doc["title"],
            "content": doc["content"],
            "source_url": doc.get("source_url"),
            "lang": doc.get("lang", "es"),
            "metadata": doc.get("metadata"),
            "created_at": doc["created_at"],
        })
    return items


@router.post("")
async def add_favorite(data: FavoriteIn, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    fav_id = str(uuid.uuid4())
    doc = {
        "id": fav_id,
        "user_id": str(user["_id"]),
        "section": data.section,
        "title": data.title,
        "content": data.content,
        "source_url": data.source_url,
        "lang": data.lang,
        "metadata": data.metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.favorites.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("user_id", None)
    return doc


@router.delete("/{fav_id}")
async def delete_favorite(fav_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    result = await db.favorites.delete_one({"id": fav_id, "user_id": str(user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"ok": True}
