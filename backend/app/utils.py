import re
import json
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app
from app.extensions import db
from app.models import ActivityLog

# Executable / dangerous extensions we always reject, regardless of config.
BLOCKED_EXTENSIONS = {
    "exe", "bat", "cmd", "sh", "ps1", "msi", "com", "scr", "vbs", "js",
    "jar", "app", "apk", "dll", "bin", "run", "dmg", "deb", "rpm",
}

MIME_MAP = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "txt": "text/plain",
}

PHONE_RE = re.compile(r"^[0-9+\-\s()]{7,20}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def sanitize_filename(filename: str) -> str:
    clean = secure_filename(filename)
    return clean or "file"


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()


def validate_file(filename: str, mime_type: str, size_bytes: int):
    """Returns (is_valid, error_message)."""
    ext = get_extension(filename)
    allowed = current_app.config["ALLOWED_FILE_TYPES"]
    max_bytes = current_app.config["MAX_FILE_SIZE_MB"] * 1024 * 1024

    if not ext:
        return False, "File must have a valid extension."
    if ext in BLOCKED_EXTENSIONS:
        return False, "This file type is not allowed for security reasons."
    if ext not in allowed:
        return False, f"Unsupported file type '.{ext}'. Allowed: {', '.join(allowed)}."
    if size_bytes > max_bytes:
        return False, f"File exceeds the {current_app.config['MAX_FILE_SIZE_MB']} MB limit."
    if size_bytes <= 0:
        return False, "File appears to be empty."

    expected_mime = MIME_MAP.get(ext)
    if expected_mime and mime_type and not _mime_is_plausible(mime_type, expected_mime, ext):
        return False, "The file content does not match its extension."

    return True, None


def _mime_is_plausible(actual_mime: str, expected_mime: str, ext: str) -> bool:
    actual_mime = (actual_mime or "").lower()
    if actual_mime == expected_mime:
        return True
    # Browsers send inconsistent mime types for office docs / text; be lenient
    # but still block obvious mismatches like an .exe renamed to .pdf.
    if ext in ("doc", "docx") and "application" in actual_mime:
        return True
    if ext == "txt" and actual_mime.startswith("text/"):
        return True
    if ext in ("jpg", "jpeg", "png", "webp") and actual_mime.startswith("image/"):
        return True
    if ext == "pdf" and "pdf" in actual_mime:
        return True
    if actual_mime in ("application/octet-stream", ""):
        # Some OS/browsers don't set a specific mime; allow, extension check already passed.
        return True
    return False


def validate_customer_info(name, phone, email):
    errors = {}
    if not name or not name.strip():
        errors["user_name"] = "Name is required."
    elif len(name.strip()) > 120:
        errors["user_name"] = "Name is too long."

    if not phone or not phone.strip():
        errors["phone"] = "Phone number is required."
    elif not PHONE_RE.match(phone.strip()):
        errors["phone"] = "Enter a valid phone number."

    if email and email.strip():
        if not EMAIL_RE.match(email.strip()):
            errors["email"] = "Enter a valid email address."

    return errors


def log_activity(request_id: str, action: str, admin_id: str = None, metadata: dict = None):
    entry = ActivityLog(
        request_id=request_id,
        admin_id=admin_id,
        action=action,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.session.add(entry)
    db.session.commit()
    return entry
