from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
)
from app.extensions import db, limiter
from app.models import Admin

admin_auth_bp = Blueprint("admin_auth", __name__, url_prefix="/api/admin")


@admin_auth_bp.route("/login", methods=["POST"])
@limiter.limit(lambda: current_app.config["RATE_LIMIT_LOGIN"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "Username/email and password are required."}), 400

    admin = Admin.query.filter(
        (Admin.username == identifier) | (Admin.email == identifier)
    ).first()

    if not admin or not admin.check_password(password):
        return jsonify({"error": "Invalid username or password."}), 401

    access_token = create_access_token(identity=admin.id)
    resp = jsonify({"admin": admin.to_dict()})
    set_access_cookies(resp, access_token)
    return resp, 200


@admin_auth_bp.route("/logout", methods=["POST"])
def logout():
    resp = jsonify({"message": "Logged out."})
    unset_jwt_cookies(resp)
    return resp, 200


@admin_auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    admin_id = get_jwt_identity()
    admin = db.session.get(Admin, admin_id)
    if not admin:
        return jsonify({"error": "Not found."}), 404
    return jsonify({"admin": admin.to_dict()})
