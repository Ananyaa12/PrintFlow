from flask import Blueprint, request, jsonify, current_app
from app.extensions import db, limiter
from app.models import PrintRequest, Document, next_request_id
from app.storage import get_storage, build_storage_key, StorageError
from app.utils import validate_customer_info, validate_file, sanitize_filename, log_activity

public_bp = Blueprint("public", __name__, url_prefix="/api/requests")

VALID_PAPER_SIZES = {"A4", "A3", "Letter", "Legal"}
VALID_COLOR_MODES = {"bw", "color"}
VALID_SIDES = {"single", "double"}
VALID_ORIENTATIONS = {"portrait", "landscape"}


@public_bp.route("", methods=["POST"])
@limiter.limit(lambda: current_app.config["RATE_LIMIT_UPLOAD"])
def create_request():
    """
    Accepts multipart/form-data with:
      - files: one or more files (field name "files")
      - user_name, phone, email
      - copies, paper_size, color_mode, print_sides, orientation, notes
    Creates the PrintRequest + Document rows and uploads files to storage.
    """
    files = request.files.getlist("files")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "At least one file is required."}), 400

    user_name = request.form.get("user_name", "").strip()
    phone = request.form.get("phone", "").strip()
    email = request.form.get("email", "").strip() or None

    errors = validate_customer_info(user_name, phone, email)
    if errors:
        return jsonify({"error": "Validation failed.", "fields": errors}), 400

    try:
        copies = int(request.form.get("copies", 1))
    except ValueError:
        return jsonify({"error": "Copies must be a number."}), 400
    if copies < 1 or copies > current_app.config["MAX_COPIES"]:
        return jsonify({"error": f"Copies must be between 1 and {current_app.config['MAX_COPIES']}."}), 400

    paper_size = request.form.get("paper_size", "A4")
    color_mode = request.form.get("color_mode", "bw")
    print_sides = request.form.get("print_sides", "single")
    orientation = request.form.get("orientation", "portrait")
    notes = request.form.get("notes", "").strip() or None

    if paper_size not in VALID_PAPER_SIZES:
        return jsonify({"error": "Invalid paper size."}), 400
    if color_mode not in VALID_COLOR_MODES:
        return jsonify({"error": "Invalid color mode."}), 400
    if print_sides not in VALID_SIDES:
        return jsonify({"error": "Invalid sides option."}), 400
    if orientation not in VALID_ORIENTATIONS:
        return jsonify({"error": "Invalid orientation."}), 400

    # Pre-validate every file before writing anything to storage/DB.
    file_payloads = []
    for f in files:
        if not f.filename:
            continue
        f.stream.seek(0, 2)
        size = f.stream.tell()
        f.stream.seek(0)
        clean_name = sanitize_filename(f.filename)
        is_valid, err = validate_file(clean_name, f.mimetype, size)
        if not is_valid:
            return jsonify({"error": f"{clean_name}: {err}"}), 400
        file_payloads.append((f, clean_name, size))

    if not file_payloads:
        return jsonify({"error": "At least one valid file is required."}), 400

    req_id_human = next_request_id()
    new_request = PrintRequest(
        request_id=req_id_human,
        user_name=user_name,
        phone=phone,
        email=email,
        copies=copies,
        paper_size=paper_size,
        color_mode=color_mode,
        print_sides=print_sides,
        orientation=orientation,
        notes=notes,
        status="PENDING",
    )
    db.session.add(new_request)
    db.session.flush()  # get new_request.id without committing

    storage = get_storage()
    uploaded_keys = []
    try:
        for f, clean_name, size in file_payloads:
            key = build_storage_key(req_id_human, clean_name)
            storage.save(key, f.stream)
            uploaded_keys.append(key)
            doc = Document(
                request_id=new_request.id,
                original_filename=clean_name,
                storage_path=key,
                mime_type=f.mimetype or "application/octet-stream",
                file_size=size,
            )
            db.session.add(doc)
        db.session.commit()
    except Exception:
        db.session.rollback()
        # best-effort cleanup of any files already written
        for key in uploaded_keys:
            try:
                storage.delete(key)
            except StorageError:
                pass
        return jsonify({"error": "Upload failed. Please try again."}), 500

    log_activity(req_id_human, "UPLOAD", metadata={"file_count": len(file_payloads)})

    return jsonify(new_request.to_dict()), 201


@public_bp.route("/<request_id>/status", methods=["GET"])
@limiter.limit("30 per minute")
def get_status(request_id):
    pr = PrintRequest.query.filter_by(request_id=request_id).first()
    if not pr or pr.status == "DELETED":
        return jsonify({"error": "Request not found."}), 404
    return jsonify(
        {
            "request_id": pr.request_id,
            "status": pr.status,
            "created_at": pr.created_at.isoformat() if pr.created_at else None,
            "completed_at": pr.completed_at.isoformat() if pr.completed_at else None,
            "file_count": len(pr.documents),
        }
    )
