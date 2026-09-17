from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EeoProfile, User
from app.routers.resume import resume_profile_to_schema
from app.schemas import EeoProfileIn, EeoProfileOut, FullProfileOut, ResumeProfileOut
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
    return FullProfileOut(
        resume=resume,
        eeo=eeo,
        has_resume=current_user.resume_profile is not None,
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
