import uuid
from datetime import datetime, date
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


def gen_uuid():
    return str(uuid.uuid4())


class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


STATUS_VALUES = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED", "DELETED"]


class PrintRequest(db.Model):
    __tablename__ = "print_requests"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    request_id = db.Column(db.String(20), unique=True, nullable=False, index=True)

    user_name = db.Column(db.String(120), nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False, index=True)
    email = db.Column(db.String(120), nullable=True)

    copies = db.Column(db.Integer, nullable=False, default=1)
    paper_size = db.Column(db.String(10), nullable=False, default="A4")
    color_mode = db.Column(db.String(10), nullable=False, default="bw")  # bw | color
    print_sides = db.Column(db.String(10), nullable=False, default="single")  # single | double
    orientation = db.Column(db.String(10), nullable=False, default="portrait")
    notes = db.Column(db.Text, nullable=True)

    status = db.Column(db.String(20), nullable=False, default="PENDING", index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.String(36), db.ForeignKey("admins.id"), nullable=True)

    documents = db.relationship(
        "Document", backref="request", lazy="joined", cascade="all, delete-orphan"
    )

    def to_dict(self, include_documents=True):
        data = {
            "id": self.id,
            "request_id": self.request_id,
            "user_name": self.user_name,
            "phone": self.phone,
            "email": self.email,
            "copies": self.copies,
            "paper_size": self.paper_size,
            "color_mode": self.color_mode,
            "print_sides": self.print_sides,
            "orientation": self.orientation,
            "notes": self.notes,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
            "file_count": len(self.documents) if self.documents is not None else 0,
        }
        if include_documents:
            data["documents"] = [d.to_dict() for d in self.documents]
        return data


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    request_id = db.Column(
        db.String(36), db.ForeignKey("print_requests.id"), nullable=False, index=True
    )
    original_filename = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)  # key/path inside bucket
    file_url = db.Column(db.String(1000), nullable=True)  # cached reference, not always public
    mime_type = db.Column(db.String(120), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # bytes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(db.Model):
    __tablename__ = "activity_logs"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    request_id = db.Column(db.String(20), nullable=False, index=True)  # human-readable PR-... id
    admin_id = db.Column(db.String(36), db.ForeignKey("admins.id"), nullable=True)
    action = db.Column(db.String(30), nullable=False)  # UPLOAD, VIEW, EDIT, DOWNLOAD, PRINT, STATUS_CHANGE, DELETE, RESTORE
    metadata_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "admin_id": self.admin_id,
            "action": self.action,
            "metadata": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RequestCounter(db.Model):
    """Guarantees gap-free-ish, unique daily sequence numbers for human-readable request IDs."""

    __tablename__ = "request_counters"

    day = db.Column(db.String(8), primary_key=True)  # YYYYMMDD
    last_value = db.Column(db.Integer, nullable=False, default=0)


def next_request_id():
    today_str = date.today().strftime("%Y%m%d")
    counter = db.session.get(RequestCounter, today_str)
    if counter is None:
        counter = RequestCounter(day=today_str, last_value=0)
        db.session.add(counter)
        db.session.flush()
    counter.last_value += 1
    db.session.flush()
    return f"PR-{today_str}-{counter.last_value:04d}"
