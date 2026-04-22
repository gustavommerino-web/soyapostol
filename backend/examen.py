"""Examen of Conscience - PDF/Doc upload. Admin-only upload, all users read.
Stores files as base64 in MongoDB (no external blob).
"""
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Depends
from bson import ObjectId
from auth import get_current_user

router = APIRouter(prefix="/examen", tags=["examen"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
}


@router.get("")
async def list_examen(request: Request):
    db = request.app.state.db
    cursor = db.examen_docs.find({}, {"data_b64": 0}).sort("created_at", -1)
    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", "Untitled"),
            "description": doc.get("description", ""),
            "lang": doc.get("lang", "es"),
            "filename": doc.get("filename", ""),
            "content_type": doc.get("content_type", ""),
            "size": doc.get("size", 0),
            "created_at": doc.get("created_at"),
        })
    return items


@router.post("/upload")
async def upload_examen(request: Request,
                        file: UploadFile = File(...),
                        title: str = Form(...),
                        description: str = Form(""),
                        lang: str = Form("es"),
                        user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    doc = {
        "title": title,
        "description": description,
        "lang": lang,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data_b64": base64.b64encode(content).decode("ascii"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": str(user["_id"]),
    }
    result = await request.app.state.db.examen_docs.insert_one(doc)
    return {"id": str(result.inserted_id), "title": title}


@router.get("/{doc_id}/file")
async def get_examen_file(doc_id: str, request: Request):
    from fastapi.responses import Response
    db = request.app.state.db
    try:
        doc = await db.examen_docs.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    data = base64.b64decode(doc["data_b64"])
    return Response(content=data, media_type=doc["content_type"],
                    headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'})


@router.delete("/{doc_id}")
async def delete_examen(doc_id: str, request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        result = await request.app.state.db.examen_docs.delete_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}
