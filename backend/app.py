import os
from app import create_app
from app.extensions import db
from app.models import Admin

app = create_app()


def seed_admin():
    """Creates the initial admin account from environment variables if no
    admin account exists yet. Safe to run on every startup."""
    with app.app_context():
        if Admin.query.first() is not None:
            return
        username = app.config["ADMIN_USERNAME"]
        email = app.config["ADMIN_EMAIL"]
        password = app.config["ADMIN_INITIAL_PASSWORD"]
        admin = Admin(username=username, email=email)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        print(f"[PrintFlow] Seeded initial admin account: {username} ({email})")
        print("[PrintFlow] IMPORTANT: change this password after first login.")


@app.cli.command("seed-admin")
def seed_admin_command():
    """flask seed-admin - manually (re)run the admin seeding step."""
    seed_admin()


if __name__ == "__main__":
    with app.app_context():
        seed_admin()
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
