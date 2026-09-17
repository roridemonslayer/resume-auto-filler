from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    resume_profile: Mapped["ResumeProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    eeo_profile: Mapped["EeoProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class ResumeProfile(Base):
    """Structured fields extracted from a user's resume. The original PDF is
    parsed in-request and never persisted, only these derived fields are."""

    __tablename__ = "resume_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # JSON-encoded lists/strings, kept simple for the MVP.
    education: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_history: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="resume_profile")


class EeoProfile(Base):
    """Voluntary self-identification fields some applications ask for
    (EEO/diversity questions). These can't be extracted from a resume --
    they're entered directly by the user in the web app, are entirely
    optional, and default to "Prefer not to say" in the UI."""

    __tablename__ = "eeo_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    veteran_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    disability_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(100), nullable=True)
    race_ethnicity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sexual_orientation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="eeo_profile")
