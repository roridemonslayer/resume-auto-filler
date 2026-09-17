import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ResumeProfile, User
from app.resume_parser import parse_resume
from app.schemas import ResumeProfileOut

router = APIRouter(prefix="/resume", tags=["resume"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


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

    # The raw PDF is parsed here and discarded; only the extracted fields
    # below are persisted.
    extracted = parse_resume(pdf_bytes)

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
