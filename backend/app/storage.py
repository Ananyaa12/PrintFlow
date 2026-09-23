"""
Storage abstraction layer.

Two backends are supported out of the box:

- "local": saves files to disk under LOCAL_STORAGE_PATH. Intended for local
  development only. Never use this in production.
- "s3": works with AWS S3, Supabase Storage (S3-compatible endpoint), or any
  other S3-compatible object storage (MinIO, Cloudflare R2, etc). Cloudinary
  can also be wired in behind this same interface via its own SDK if desired.

The rest of the application only talks to `get_storage()`, so swapping the
backend is a matter of changing STORAGE_PROVIDER in the environment - no
route or model code needs to change.
"""
import os
import uuid
from datetime import timedelta
from flask import current_app


class StorageError(Exception):
    pass


class LocalStorage:
    def __init__(self, base_path):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    def _full_path(self, key):
        return os.path.join(self.base_path, key)

    def save(self, key, file_stream):
        full_path = self._full_path(key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        file_stream.seek(0)
        with open(full_path, "wb") as f:
            f.write(file_stream.read())
        return key

    def delete(self, key):
        full_path = self._full_path(key)
        if os.path.exists(full_path):
            os.remove(full_path)

    def read_bytes(self, key):
        full_path = self._full_path(key)
        if not os.path.exists(full_path):
            raise StorageError("File not found in storage")
        with open(full_path, "rb") as f:
            return f.read()

    def get_signed_url(self, key, expires_seconds=300):
        # Local dev fallback: served via a backend route that streams the file
        # after checking admin authentication, not a real public/signed URL.
        return None


class S3CompatibleStorage:
    def __init__(self, bucket, endpoint_url, region, access_key, secret_key):
        import boto3
        from botocore.client import Config as BotoConfig

        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=BotoConfig(signature_version="s3v4"),
        )

    def save(self, key, file_stream):
        file_stream.seek(0)
        self.client.upload_fileobj(file_stream, self.bucket, key)
        return key

    def delete(self, key):
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def read_bytes(self, key):
        obj = self.client.get_object(Bucket=self.bucket, Key=key)
        return obj["Body"].read()

    def get_signed_url(self, key, expires_seconds=300):
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_seconds,
        )


def get_storage():
    provider = current_app.config["STORAGE_PROVIDER"]
    if provider == "local":
        return LocalStorage(current_app.config["LOCAL_STORAGE_PATH"])
    elif provider == "s3":
        return S3CompatibleStorage(
            bucket=current_app.config["STORAGE_BUCKET"],
            endpoint_url=current_app.config["STORAGE_URL"],
            region=current_app.config["STORAGE_REGION"],
            access_key=current_app.config["STORAGE_ACCESS_KEY"],
            secret_key=current_app.config["STORAGE_SECRET_KEY"],
        )
    else:
        raise StorageError(f"Unknown STORAGE_PROVIDER: {provider}")


def build_storage_key(request_id: str, original_filename: str) -> str:
    """Builds a collision-safe, sanitized storage key/path for a file."""
    ext = ""
    if "." in original_filename:
        ext = "." + original_filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return f"requests/{request_id}/{unique_name}"
