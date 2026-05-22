from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Role, User
from app.routers import auth, dashboards, datasets, users
from app.security import hash_password

app = FastAPI(title="Analiz — Web BI Platform", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(datasets.router)
app.include_router(dashboards.router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == settings.admin_email).first():
            db.add(
                User(
                    email=settings.admin_email,
                    full_name="Administrator",
                    hashed_password=hash_password(settings.admin_password),
                    role=Role.admin,
                )
            )
            db.commit()
            logger.info("Created default admin: {}", settings.admin_email)
    finally:
        db.close()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
