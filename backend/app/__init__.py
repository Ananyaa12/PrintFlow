from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, migrate, jwt, cors, limiter


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    from app.routes.public import public_bp
    from app.routes.admin_auth import admin_auth_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(public_bp)
    app.register_blueprint(admin_auth_bp)
    app.register_blueprint(admin_bp)

    register_error_handlers(app)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "PrintFlow API"})

    return app


def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request."}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized. Please log in again."}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Access denied."}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "Upload too large."}), 413

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({"error": "Too many requests. Please slow down and try again shortly."}), 429

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "An unexpected server error occurred."}), 500

    from flask_jwt_extended.exceptions import NoAuthorizationError

    @app.errorhandler(NoAuthorizationError)
    def no_auth(e):
        return jsonify({"error": "Authentication required."}), 401


from app.extensions import jwt as _jwt


@_jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({"error": "Session expired. Please log in again."}), 401


@_jwt.invalid_token_loader
def invalid_token_callback(reason):
    return jsonify({"error": "Invalid session. Please log in again."}), 401


@_jwt.unauthorized_loader
def missing_token_callback(reason):
    return jsonify({"error": "Authentication required."}), 401
