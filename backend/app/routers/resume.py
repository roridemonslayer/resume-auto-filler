import json
import re

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ResumeFile, ResumeProfile, User
from app.resume_parser import parse_resume
from app.schemas import ResumeProfileOut

router = APIRouter(prefix="/resume", tags=["resume"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


def _safe_filename(name: str | None) -> str:
    """Keep only the base name and harmless characters; this ends up in a
    Content-Disposition header and in the file input the extension fills."""
    base = (name or "resume.pdf").replace("\\", "/").rsplit("/", 1)[-1]
    base = re.sub(r"[^A-Za-z0-9._ ()-]", "_", base).strip(" .") or "resume.pdf"
    if not base.lower().endswith(".pdf"):
        base += ".pdf"
    return base[:150]


def resume_profile_to_schema(profile: ResumeProfile) -> ResumeProfileOut:
    return ResumeProfileOut(
        first_name=profile.first_name,
        last_name=profile.last_name,
        email=profile.email,
        phone=profile.phone,
        education=json.loads(profile.education) if profile.education else [],
        skills=json.loads(profile.skills) if profile.skills else [],
        work_history=json.loads(profile.work_history) if profile.work_history else [],
    )


@router.post("/upload", response_model=ResumeProfileOut)
async def upload_resume(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF resumes are supported",
        )

    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Resume file is too large (max 5 MB)",
        )

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="That file doesn't look like a PDF",
        )

    extracted = parse_resume(pdf_bytes)

    # The original PDF is kept (one per user) so the extension can attach it to
    # applications' upload fields; users can remove it via DELETE /resume/file.
    stored = current_user.resume_file
    if stored is None:
        stored = ResumeFile(user_id=current_user.id, filename="", data=b"", size=0)
        db.add(stored)
    stored.filename = _safe_filename(file.filename)
    stored.data = pdf_bytes
    stored.size = len(pdf_bytes)

    profile = current_user.resume_profile
    if profile is None:
        profile = ResumeProfile(user_id=current_user.id)
        db.add(profile)

    profile.first_name = extracted["first_name"]
    profile.last_name = extracted["last_name"]
    profile.email = extracted["email"]
    profile.phone = extracted["phone"]
    profile.education = json.dumps(extracted["education"])
    profile.skills = json.dumps(extracted["skills"])
    profile.work_history = json.dumps(extracted["work_history"])

    db.commit()
    db.refresh(profile)

    return resume_profile_to_schema(profile)


@router.get("/file")
def download_resume_file(current_user: User = Depends(get_current_user)):
    stored = current_user.resume_file
    if stored is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resume file on record")
    return Response(
        content=stored.data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{stored.filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )


@router.delete("/file", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume_file(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stored = current_user.resume_file
    if stored is not None:
        db.delete(stored)
        db.commit()
