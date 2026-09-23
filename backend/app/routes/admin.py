from datetime import datetime, timedelta, date
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, func

from app.extensions import db
from app.models import PrintRequest, Document, ActivityLog, STATUS_VALUES
from app.storage import get_storage, StorageError
from app.utils import validate_customer_info, log_activity

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

PAGE_SIZE_DEFAULT = 20


def _paginate_query(query):
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", PAGE_SIZE_DEFAULT, type=int)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = query.count()
    items = (
        query.offset((page - 1) * page_size).limit(page_size).all()
    )
    return items, {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if page_size else 1,
    }


def _apply_filters(query, exclude_deleted=True):
    if exclude_deleted:
        query = query.filter(PrintRequest.status != "DELETED")

    status = request.args.get("status")
    if status and status != "All" and status in STATUS_VALUES:
        query = query.filter(PrintRequest.status == status)

    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        query = query.outerjoin(Document).filter(
            or_(
                PrintRequest.request_id.ilike(like),
                PrintRequest.user_name.ilike(like),
                PrintRequest.phone.ilike(like),
                Document.original_filename.ilike(like),
            )
        ).distinct()

    file_type = request.args.get("file_type")
    if file_type and file_type != "All":
        ext_map = {
            "PDF": ["pdf"],
            "DOC": ["doc"],
            "DOCX": ["docx"],
            "Image": ["jpg", "jpeg", "png", "webp"],
            "Other": ["txt"],
        }
        exts = ext_map.get(file_type, [])
        if exts:
            conds = [Document.original_filename.ilike(f"%.{e}") for e in exts]
            query = query.join(Document).filter(or_(*conds)).distinct()

    date_range = request.args.get("date_range")
    now = datetime.utcnow()
    if date_range == "today":
        start = datetime.combine(date.today(), datetime.min.time())
        query = query.filter(PrintRequest.created_at >= start)
    elif date_range == "yesterday":
        start = datetime.combine(date.today() - timedelta(days=1), datetime.min.time())
        end = datetime.combine(date.today(), datetime.min.time())
        query = query.filter(PrintRequest.created_at >= start, PrintRequest.created_at < end)
    elif date_range == "7days":
        query = query.filter(PrintRequest.created_at >= now - timedelta(days=7))
    elif date_range == "30days":
        query = query.filter(PrintRequest.created_at >= now - timedelta(days=30))
    elif date_range == "custom":
        start_str = request.args.get("start_date")
        end_str = request.args.get("end_date")
        if start_str:
            query = query.filter(PrintRequest.created_at >= start_str)
        if end_str:
            query = query.filter(PrintRequest.created_at <= end_str)

    sort = request.args.get("sort", "newest")
    if sort == "oldest":
        query = query.order_by(PrintRequest.created_at.asc())
    elif sort == "name_asc":
        query = query.order_by(PrintRequest.user_name.asc())
    elif sort == "name_desc":
        query = query.order_by(PrintRequest.user_name.desc())
    else:
        query = query.order_by(PrintRequest.created_at.desc())

    return query


@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    base = PrintRequest.query.filter(PrintRequest.status != "DELETED")
    total = base.count()
    pending = base.filter(PrintRequest.status == "PENDING").count()
    processing = base.filter(PrintRequest.status == "PROCESSING").count()
    completed = base.filter(PrintRequest.status == "COMPLETED").count()
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_count = base.filter(PrintRequest.created_at >= today_start).count()

    recent = base.order_by(PrintRequest.created_at.desc()).limit(10).all()

    return jsonify(
        {
            "stats": {
                "total_requests": total,
                "pending": pending,
                "processing": processing,
                "completed": completed,
                "today_requests": today_count,
            },
            "recent_requests": [r.to_dict(include_documents=False) for r in recent],
        }
    )


@admin_bp.route("/requests", methods=["GET"])
@jwt_required()
def list_requests():
    query = PrintRequest.query
    query = _apply_filters(query, exclude_deleted=True)
    items, meta = _paginate_query(query)
    return jsonify(
        {
            "items": [r.to_dict(include_documents=False) for r in items],
            "pagination": meta,
        }
    )


@admin_bp.route("/requests/<req_id>", methods=["GET"])
@jwt_required()
def get_request(req_id):
    pr = _find_or_404(req_id)
    if isinstance(pr, tuple):
        return pr
    admin_id = get_jwt_identity()
    log_activity(pr.request_id, "VIEW", admin_id=admin_id)
    return jsonify(pr.to_dict())


EDITABLE_FIELDS = {
    "user_name", "phone", "email", "copies", "paper_size",
    "color_mode", "print_sides", "orientation", "notes", "status",
}


@admin_bp.route("/requests/<req_id>", methods=["PUT"])
@jwt_required()
def update_request(req_id):
    pr = _find_or_404(req_id)
    if isinstance(pr, tuple):
        return pr

    data = request.get_json(silent=True) or {}
    admin_id = get_jwt_identity()

    if "user_name" in data or "phone" in data or "email" in data:
        errors = validate_customer_info(
            data.get("user_name", pr.user_name),
            data.get("phone", pr.phone),
            data.get("email", pr.email),
        )
        if errors:
            return jsonify({"error": "Validation failed.", "fields": errors}), 400

    changes = {}
    for field in EDITABLE_FIELDS:
        if field in data:
            old_value = getattr(pr, field)
            new_value = data[field]
            if field == "status" and new_value not in STATUS_VALUES:
                return jsonify({"error": f"Invalid status: {new_value}"}), 400
            if field == "copies":
                try:
                    new_value = int(new_value)
                except (TypeError, ValueError):
                    return jsonify({"error": "Copies must be a number."}), 400
                if new_value < 1 or new_value > current_app.config["MAX_COPIES"]:
                    return jsonify({"error": "Copies out of allowed range."}), 400
            if old_value != new_value:
                changes[field] = {"from": old_value, "to": new_value}
                setattr(pr, field, new_value)
                if field == "status" and new_value == "COMPLETED":
                    pr.completed_at = datetime.utcnow()

    db.session.commit()

    if "status" in changes:
        log_activity(pr.request_id, "STATUS_CHANGE", admin_id=admin_id, metadata=changes.get("status"))
    other_changes = {k: v for k, v in changes.items() if k != "status"}
    if other_changes:
        log_activity(pr.request_id, "EDIT", admin_id=admin_id, metadata=other_changes)

    return jsonify(pr.to_dict())


@admin_bp.route("/requests/<req_id>", methods=["DELETE"])
@jwt_required()
def soft_delete_request(req_id):
    pr = _find_or_404(req_id)
    if isinstance(pr, tuple):
        return pr
    admin_id = get_jwt_identity()

    permanent = request.args.get("permanent", "false").lower() == "true"

    if permanent:
        if pr.status != "DELETED":
            return jsonify({"error": "Move to trash before permanently deleting."}), 400
        storage = get_storage()
        for doc in pr.documents:
            try:
                storage.delete(doc.storage_path)
            except StorageError:
                pass
        req_human_id = pr.request_id
        db.session.delete(pr)
        db.session.commit()
        log_activity(req_human_id, "DELETE", admin_id=admin_id, metadata={"permanent": True})
        return jsonify({"message": "Permanently deleted."})

    pr.status = "DELETED"
    pr.deleted_at = datetime.utcnow()
    pr.deleted_by = admin_id
    db.session.commit()
    log_activity(pr.request_id, "DELETE", admin_id=admin_id, metadata={"permanent": False})
    return jsonify(pr.to_dict())


@admin_bp.route("/requests/<req_id>/restore", methods=["POST"])
@jwt_required()
def restore_request(req_id):
    pr = PrintRequest.query.filter_by(request_id=req_id).first()
    if not pr:
        return jsonify({"error": "Request not found."}), 404
    admin_id = get_jwt_identity()
    pr.status = "PENDING"
    pr.deleted_at = None
    pr.deleted_by = None
    db.session.commit()
    log_activity(pr.request_id, "RESTORE", admin_id=admin_id)
    return jsonify(pr.to_dict())


@admin_bp.route("/requests/<req_id>/print", methods=["POST"])
@jwt_required()
def mark_printed(req_id):
    pr = _find_or_404(req_id)
    if isinstance(pr, tuple):
        return pr
    admin_id = get_jwt_identity()
    log_activity(pr.request_id, "PRINT", admin_id=admin_id)
    return jsonify({"message": "Print event recorded.", "request_id": pr.request_id})


@admin_bp.route("/trash", methods=["GET"])
@jwt_required()
def list_trash():
    query = PrintRequest.query.filter(PrintRequest.status == "DELETED").order_by(
        PrintRequest.deleted_at.desc()
    )
    items, meta = _paginate_query(query)
    return jsonify(
        {
            "items": [r.to_dict(include_documents=False) for r in items],
            "pagination": meta,
        }
    )


@admin_bp.route("/history", methods=["GET"])
@jwt_required()
def history():
    query = PrintRequest.query
    query = _apply_filters(query, exclude_deleted=False)
    items, meta = _paginate_query(query)
    return jsonify(
        {
            "items": [r.to_dict(include_documents=False) for r in items],
            "pagination": meta,
        }
    )


@admin_bp.route("/activity/<request_id>", methods=["GET"])
@jwt_required()
def activity_for_request(request_id):
    logs = (
        ActivityLog.query.filter_by(request_id=request_id)
        .order_by(ActivityLog.created_at.asc())
        .all()
    )
    return jsonify({"items": [l.to_dict() for l in logs]})


@admin_bp.route("/files/<file_id>/download", methods=["GET"])
@jwt_required()
def download_file(file_id):
    doc = db.session.get(Document, file_id)
    if not doc:
        return jsonify({"error": "File not found."}), 404
    admin_id = get_jwt_identity()
    pr = doc.request
    storage = get_storage()
    try:
        data = storage.read_bytes(doc.storage_path)
    except StorageError:
        return jsonify({"error": "File could not be retrieved from storage."}), 500
    log_activity(pr.request_id if pr else "", "DOWNLOAD", admin_id=admin_id, metadata={"file": doc.original_filename})
    return send_file(
        BytesIO(data),
        mimetype=doc.mime_type,
        as_attachment=True,
        download_name=doc.original_filename,
    )


@admin_bp.route("/files/<file_id>/preview", methods=["GET"])
@jwt_required()
def preview_file(file_id):
    doc = db.session.get(Document, file_id)
    if not doc:
        return jsonify({"error": "File not found."}), 404
    admin_id = get_jwt_identity()
    pr = doc.request
    storage = get_storage()

    previewable = doc.mime_type.startswith("image/") or doc.mime_type == "application/pdf"
    if not previewable:
        return jsonify({"error": "Preview unavailable for this file type.", "previewable": False}), 200

    try:
        data = storage.read_bytes(doc.storage_path)
    except StorageError:
        return jsonify({"error": "File could not be retrieved from storage."}), 500

    log_activity(pr.request_id if pr else "", "VIEW", admin_id=admin_id, metadata={"file": doc.original_filename, "preview": True})
    return send_file(BytesIO(data), mimetype=doc.mime_type, as_attachment=False)


def _find_or_404(req_id):
    pr = PrintRequest.query.filter_by(request_id=req_id).first()
    if not pr:
        return jsonify({"error": "Request not found."}), 404
    return pr
