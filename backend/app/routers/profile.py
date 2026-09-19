import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EeoProfile, ResumeProfile, User
from app.routers.resume import resume_profile_to_schema
from app.schemas import (
    EeoProfileIn,
    EeoProfileOut,
    FullProfileOut,
    ResumeFileInfo,
    ResumeProfileIn,
    ResumeProfileOut,
)
from app.deps import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=FullProfileOut)
def get_my_profile(current_user: User = Depends(get_current_user)):
    resume = (
        resume_profile_to_schema(current_user.resume_profile)
        if current_user.resume_profile
        else ResumeProfileOut()
    )
    eeo = (
        EeoProfileOut.model_validate(current_user.eeo_profile)
        if current_user.eeo_profile
        else EeoProfileOut()
    )
    stored = current_user.resume_file
    return FullProfileOut(
        resume=resume,
        eeo=eeo,
        has_resume=current_user.resume_profile is not None,
        resume_file=(
            ResumeFileInfo(name=stored.filename, size=stored.size, updated_at=stored.updated_at)
            if stored
            else None
        ),
    )


@router.put("/demographics", response_model=EeoProfileOut)
def update_demographics(
    payload: EeoProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = current_user.eeo_profile
    if profile is None:
        profile = EeoProfile(user_id=current_user.id)
        db.add(profile)

    profile.veteran_status = payload.veteran_status
    profile.disability_status = payload.disability_status
    profile.gender = payload.gender
    profile.race_ethnicity = payload.race_ethnicity
    profile.sexual_orientation = payload.sexual_orientation

    db.commit()
    db.refresh(profile)

    return EeoProfileOut.model_validate(profile)


@router.put("/resume", response_model=ResumeProfileOut)
def update_resume_profile(
    payload: ResumeProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = current_user.resume_profile
    if profile is None:
        profile = ResumeProfile(user_id=current_user.id)
        db.add(profile)

    profile.first_name = payload.first_name
    profile.last_name = payload.last_name
    profile.email = payload.email
    profile.phone = payload.phone
    profile.education = json.dumps(payload.education)
    profile.skills = json.dumps(payload.skills)
    profile.work_history = json.dumps(payload.work_history)

    db.commit()
    db.refresh(profile)

    return resume_profile_to_schema(profile)
