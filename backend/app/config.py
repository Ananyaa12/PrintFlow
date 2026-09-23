import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Core
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 60))
    )
    JWT_TOKEN_LOCATION = ["cookies", "headers"]
    JWT_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"
    JWT_COOKIE_CSRF_PROTECT = (
        os.environ.get("JWT_COOKIE_CSRF_PROTECT", "false").strip().lower()
        in {"1", "true", "yes", "on"}
    )
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_COOKIE_HTTPONLY = True

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/printflow"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # CORS
    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]

    # Storage
    STORAGE_PROVIDER = os.environ.get("STORAGE_PROVIDER", "local")
    STORAGE_BUCKET = os.environ.get("STORAGE_BUCKET", "printflow-documents")
    STORAGE_URL = os.environ.get("STORAGE_URL", "")
    STORAGE_REGION = os.environ.get("STORAGE_REGION", "us-east-1")
    STORAGE_ACCESS_KEY = os.environ.get("STORAGE_ACCESS_KEY", "")
    STORAGE_SECRET_KEY = os.environ.get("STORAGE_SECRET_KEY", "")
    LOCAL_STORAGE_PATH = os.environ.get("LOCAL_STORAGE_PATH", "./storage_local")

    # Uploads
    MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", 20))
    MAX_CONTENT_LENGTH = MAX_FILE_SIZE_MB * 1024 * 1024 * 20  # allow multi-file batches
    ALLOWED_FILE_TYPES = [
        t.strip().lower()
        for t in os.environ.get(
            "ALLOWED_FILE_TYPES", "pdf,doc,docx,jpg,jpeg,png,webp,txt"
        ).split(",")
        if t.strip()
    ]

    # Admin seed
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@printflow.local")
    ADMIN_INITIAL_PASSWORD = os.environ.get("ADMIN_INITIAL_PASSWORD", "ChangeMe123!")

    # Rate limits
    RATE_LIMIT_UPLOAD = os.environ.get("RATE_LIMIT_UPLOAD", "10 per hour")
    RATE_LIMIT_LOGIN = os.environ.get("RATE_LIMIT_LOGIN", "5 per minute")

    # Defaults for print preferences (also exposed via /admin/settings)
    DEFAULT_PAPER_SIZE = "A4"
    DEFAULT_COLOR_MODE = "bw"
    DEFAULT_SIDES = "single"
    MAX_COPIES = 100
