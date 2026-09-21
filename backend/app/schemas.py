from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleAuthIn(BaseModel):
    credential: str


class GoogleAuthOut(Token):
    is_new_user: bool


class ResumeProfileOut(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    education: list[str] = []
    skills: list[str] = []
    work_history: list[str] = []

    class Config:
        from_attributes = True


class EeoProfileIn(BaseModel):
    veteran_status: str | None = None
    disability_status: str | None = None
    gender: str | None = None
    race_ethnicity: str | None = None
    sexual_orientation: str | None = None


class EeoProfileOut(EeoProfileIn):
    class Config:
        from_attributes = True


class ResumeFileInfo(BaseModel):
    name: str
    size: int
    updated_at: datetime


class FullProfileOut(BaseModel):
    resume: ResumeProfileOut
    eeo: EeoProfileOut
    has_resume: bool
    resume_file: ResumeFileInfo | None = None


def _clean_str(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _clean_list(values: list[str]) -> list[str]:
    return [v.strip() for v in values if v and v.strip()]


class ResumeProfileIn(BaseModel):
    """Full replacement of the editable resume fields. Blank strings are
    stored as null and blank list entries are dropped."""

    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    linkedin_url: str | None = Field(default=None, max_length=500)
    github_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)
    education: list[str] = Field(default_factory=list, max_length=60)
    skills: list[str] = Field(default_factory=list, max_length=150)
    work_history: list[str] = Field(default_factory=list, max_length=250)

    @field_validator("first_name", "last_name", "email", "phone")
    @classmethod
    def _strip_optional(cls, v: str | None) -> str | None:
        return _clean_str(v)

    @field_validator("linkedin_url", "github_url", "website_url")
    @classmethod
    def _link(cls, v: str | None) -> str | None:
        v = _clean_str(v)
        if v is None:
            return None
        if not v.lower().startswith(("http://", "https://")):
            v = f"https://{v}"  # people type "linkedin.com/in/me"
        if " " in v or "." not in v:
            raise ValueError("Enter a valid link")
        return v

    @field_validator("email")
    @classmethod
    def _basic_email_shape(cls, v: str | None) -> str | None:
        if v is not None and ("@" not in v or " " in v):
            raise ValueError("Enter a valid email address")
        return v

    @field_validator("education", "skills", "work_history")
    @classmethod
    def _strip_list(cls, v: list[str]) -> list[str]:
        cleaned = _clean_list(v)
        if any(len(item) > 600 for item in cleaned):
            raise ValueError("Each entry must be 600 characters or fewer")
        return cleaned


ApplicationStatus = Literal["filled", "applied", "interviewing", "offer", "rejected"]


def _check_http_url(v: str | None) -> str | None:
    v = _clean_str(v)
    if v is not None and not v.lower().startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")
    return v


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    role: str | None = Field(default=None, max_length=300)
    url: str | None = Field(default=None, max_length=2048)
    status: ApplicationStatus = "applied"
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("company")
    @classmethod
    def _company(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Company is required")
        return v

    @field_validator("role", "notes")
    @classmethod
    def _strip_text(cls, v: str | None) -> str | None:
        return _clean_str(v)

    @field_validator("url")
    @classmethod
    def _url(cls, v: str | None) -> str | None:
        return _check_http_url(v)


class ApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=200)
    role: str | None = Field(default=None, max_length=300)
    url: str | None = Field(default=None, max_length=2048)
    status: ApplicationStatus | None = None
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("company")
    @classmethod
    def _company(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Company can't be blank")
        return v

    @field_validator("role", "notes")
    @classmethod
    def _strip_text(cls, v: str | None) -> str | None:
        return _clean_str(v)

    @field_validator("url")
    @classmethod
    def _url(cls, v: str | None) -> str | None:
        return _check_http_url(v)


class ApplicationOut(BaseModel):
    id: int
    company: str
    role: str | None = None
    url: str | None = None
    status: ApplicationStatus
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
