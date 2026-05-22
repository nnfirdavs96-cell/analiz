from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from sqlalchemy import text

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Department, Role, User
from app.routers import access, audit, auth, dashboards, datasets, departments, meetings, settings as settings_router, users
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
app.include_router(departments.router)
app.include_router(datasets.router)
app.include_router(dashboards.router)
app.include_router(audit.router)
app.include_router(settings_router.router)
app.include_router(access.router)
app.include_router(meetings.router)


@app.on_event("startup")
def on_startup() -> None:
    # Idempotent schema migrations (add new columns / enum values to existing tables)
    try:
        with engine.connect() as conn:
            conn = conn.execution_options(isolation_level="AUTOCOMMIT")
            # Expand Role enum with all values
            for r in Role:
                try:
                    conn.execute(text(f"ALTER TYPE role ADD VALUE IF NOT EXISTS '{r.value}'"))
                except Exception:
                    pass
            # Add columns that may be missing from existing tables
            column_migrations = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
                "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
                "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
                "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS description TEXT",
            ]
            for sql in column_migrations:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass
    except Exception as e:
        logger.debug("Schema migration error: {}", e)

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

        if db.query(Department).count() == 0:
            defaults = [
                ("Продажи", "Отдел продаж и работы с клиентами", "#3b82f6"),
                ("Маркетинг", "Маркетинг и реклама", "#8b5cf6"),
                ("Финансы", "Финансовый отдел и бухгалтерия", "#10b981"),
                ("HR", "Кадровая служба", "#f59e0b"),
                ("IT", "Информационные технологии", "#06b6d4"),
                ("Производство", "Производственный отдел", "#ef4444"),
            ]
            for name, desc, color in defaults:
                db.add(Department(name=name, description=desc, color=color))
            db.commit()
            logger.info("Seeded {} departments", len(defaults))
    finally:
        db.close()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
