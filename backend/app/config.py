from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://analiz:analiz_pass@postgres:5432/analiz"
    redis_url: str = "redis://redis:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    admin_email: str = "admin@analiz.local"
    admin_password: str = "admin123"

    upload_dir: str = "/app/uploads"
    max_upload_mb: int = 100


settings = Settings()
