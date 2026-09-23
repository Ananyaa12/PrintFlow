"""WSGI entrypoint for production servers (e.g. gunicorn on Render).

Run with:
    gunicorn wsgi:app
"""
from app import create_app
from app.extensions import db
from app.models import Admin

app = create_app()

with app.app_context():
    if Admin.query.first() is None:
        username = app.config["ADMIN_USERNAME"]
        email = app.config["ADMIN_EMAIL"]
        password = app.config["ADMIN_INITIAL_PASSWORD"]
        admin = Admin(username=username, email=email)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
