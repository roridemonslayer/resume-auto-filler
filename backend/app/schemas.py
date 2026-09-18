from pydantic import BaseModel, EmailStr, Field


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


class FullProfileOut(BaseModel):
    resume: ResumeProfileOut
    eeo: EeoProfileOut
    has_resume: bool
