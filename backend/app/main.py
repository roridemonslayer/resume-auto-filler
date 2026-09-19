from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import applications, auth, profile, resume

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Auto-Filler API")

# Each install of the Chrome extension gets a different chrome-extension://
# origin, and requests carry a bearer token rather than cookies, so a
# wildcard origin without credentials is the right trade-off here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(profile.router)
app.include_router(applications.router)


@app.get("/health")
def health():
    return {"status": "ok"}
