from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Application, User, utcnow
from app.schemas import ApplicationCreate, ApplicationOut, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


def _get_owned(db: Session, user: User, application_id: int) -> Application:
    application = (
        db.query(Application)
        .filter(Application.id == application_id, Application.user_id == user.id)
        .first()
    )
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.get("", response_model=list[ApplicationOut])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.updated_at.desc(), Application.id.desc())
        .all()
    )


@router.post("", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # The extension reports every fill, so re-filling the same page must not
    # spawn duplicates: bump the existing row and leave its status alone.
    if payload.url:
        existing = (
            db.query(Application)
            .filter(Application.user_id == current_user.id, Application.url == payload.url)
            .first()
        )
        if existing is not None:
            existing.updated_at = utcnow()
            db.commit()
            db.refresh(existing)
            return existing

    application = Application(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        url=payload.url,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    response.status_code = status.HTTP_201_CREATED
    return application


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = _get_owned(db, current_user, application_id)

    for field in payload.model_fields_set:
        value = getattr(payload, field)
        if value is None and field in ("company", "status"):
            continue  # required columns: ignore an explicit null instead of erroring
        setattr(application, field, value)

    db.commit()
    db.refresh(application)
    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = _get_owned(db, current_user, application_id)
    db.delete(application)
    db.commit()
