# PrintFlow

**Simple Document Submission & Printing**

PrintFlow is a full-stack document submission and printing management platform. Anyone can upload documents and printing preferences without creating an account; an authenticated admin manages, previews, edits, downloads, prints, and tracks every request through its full lifecycle.

---

## Features

**Public**
- No registration or login required
- Drag-and-drop multi-file upload (PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP, TXT)
- Printing preferences: copies, paper size, color mode, sides, orientation, notes
- Unique, human-readable request ID (`PR-YYYYMMDD-XXXX`) returned on submission
- Request status lookup by ID

**Admin**
- Secure login (hashed passwords, JWT in httpOnly cookies)
- Dashboard with live stats (total, pending, processing, completed, today)
- Searchable, filterable, paginated document management
- Document detail view: edit customer info & print preferences, change status
- File preview (PDF/image inline, safe fallback for other types), secure download, browser-based print
- Full history that survives logout/restart (stored in PostgreSQL)
- Per-request activity log (upload, view, edit, download, print, status change, delete, restore)
- Soft-delete Trash with restore and permanent delete (with confirmation)
- Settings page showing profile and system defaults

---

## Technology Stack

**Frontend:** React, Vite, JavaScript, Tailwind CSS, React Router, Lucide React, Axios
**Backend:** Python, Flask, Flask-CORS, Flask-JWT-Extended, SQLAlchemy, Flask-Migrate, Flask-Limiter
**Database:** PostgreSQL
**File Storage:** Pluggable storage abstraction — local disk for development, any S3-compatible service (Supabase Storage, AWS S3, Cloudflare R2, MinIO) for production. Files are never stored in the database, only metadata and storage references.

---

## Architecture

```
Browser (public user) ──► React/Vite frontend (Vercel)
                              │  Axios (withCredentials)
                              ▼
                        Flask REST API (Render)
                          │            │
                          ▼            ▼
                    PostgreSQL   Object Storage (S3-compatible)
                 (metadata only)   (actual files, private bucket)
```

Public routes create `PrintRequest` + `Document` rows and upload files to the storage backend. Admin routes are protected by JWT (httpOnly cookie) and can read/update/delete/restore requests, and generate short-lived access to files for preview/download.

---

## Project Structure

```
PrintFlow/
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI (FileUpload, Modal, StatusBadge, ...)
│   │   ├── pages/            # Route-level pages (Home, Success, Admin*)
│   │   ├── layouts/           # AdminLayout (sidebar/topbar)
│   │   ├── services/api.js    # Axios instance + typed API calls
│   │   ├── hooks/             # useAuth, useToast
│   │   ├── App.jsx / main.jsx
│   ├── index.html, vite.config.js, tailwind.config.js
│   └── .env.example
├── backend/
│   ├── app/
│   │   ├── routes/            # public.py, admin_auth.py, admin.py
│   │   ├── models.py          # Admin, PrintRequest, Document, ActivityLog
│   │   ├── storage.py         # Local + S3-compatible storage abstraction
│   │   ├── utils.py           # Validation, sanitization, activity logging
│   │   ├── config.py, extensions.py, __init__.py
│   ├── migrations/            # Flask-Migrate / Alembic (generated locally)
│   ├── app.py                 # Local dev entrypoint (also seeds admin)
│   ├── wsgi.py                # Production entrypoint (gunicorn)
│   ├── requirements.txt
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Installation & Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- A PostgreSQL database (local install, Docker, or a free instance from Supabase/Neon/Render)

### 1. Clone and configure environment variables

```bash
git clone <your-repo-url> PrintFlow
cd PrintFlow
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and set at least `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`, and the `ADMIN_*` values. Never commit `.env`.

### 2. Backend setup

**macOS/Linux:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask db init        # first time only
flask db migrate -m "initial schema"
flask db upgrade
python app.py
```

**Windows PowerShell:**
```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask db init
flask db migrate -m "initial schema"
flask db upgrade
python app.py
```

The API runs at `http://localhost:5000`. On first run it automatically seeds an admin account from `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` if none exists yet — **change this password after your first login.**

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and talks to the API via `VITE_API_URL`.

---

## Environment Variables

**Frontend (`frontend/.env`)**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
| `VITE_MAX_FILE_SIZE_MB` | Shown in the UI; should match the backend limit |

**Backend (`backend/.env`)**
| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask secret key |
| `JWT_SECRET_KEY` | JWT signing key |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `STORAGE_PROVIDER` | `local` (dev only) or `s3` (S3-compatible, production) |
| `STORAGE_BUCKET`, `STORAGE_URL`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | Object storage credentials — never exposed to the frontend |
| `MAX_FILE_SIZE_MB` | Per-file upload limit |
| `ALLOWED_FILE_TYPES` | Comma-separated allowed extensions |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Seed values for the first admin account only |
| `RATE_LIMIT_UPLOAD`, `RATE_LIMIT_LOGIN` | Rate limiting rules |

`.env.example` files are provided in both `frontend/` and `backend/`. Real `.env` files are gitignored and must never be committed.

---

## Database Setup

Tables: `admins`, `print_requests`, `documents`, `activity_logs`, plus a small `request_counters` helper table used to generate gap-free daily sequence numbers for human-readable request IDs. Indexes are defined on `request_id`, `created_at`, `status`, `phone`, and `user_name` via SQLAlchemy `index=True`.

Migrations use Flask-Migrate (Alembic). Common commands:
```bash
flask db init            # once, to create the migrations folder
flask db migrate -m "message"   # generate a new migration after model changes
flask db upgrade          # apply migrations
```

## Storage Setup

1. Create a private bucket with your provider of choice (Supabase Storage, AWS S3, Cloudflare R2, MinIO, etc).
2. Set `STORAGE_PROVIDER=s3`, `STORAGE_BUCKET`, `STORAGE_URL` (the S3-compatible endpoint), `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.
3. Keep the bucket private. The backend streams files through authenticated admin routes (`/api/admin/files/:id/download`, `/api/admin/files/:id/preview`) rather than exposing public URLs.

For local development, leave `STORAGE_PROVIDER=local`; files are written under `backend/storage_local/` (gitignored).

---

## API Documentation

**Public**
| Method | Route | Description |
|---|---|---|
| POST | `/api/requests` | Submit a new request (multipart: `files[]` + customer + print fields) |
| GET | `/api/requests/:request_id/status` | Look up status by request ID |

**Admin (JWT-protected)**
| Method | Route | Description |
|---|---|---|
| POST | `/api/admin/login` | Login, sets httpOnly JWT cookie |
| POST | `/api/admin/logout` | Clears session |
| GET | `/api/admin/me` | Current admin profile |
| GET | `/api/admin/dashboard` | Stats + recent requests |
| GET | `/api/admin/requests` | Paginated, searchable, filterable list |
| GET | `/api/admin/requests/:id` | Full request detail (logs a VIEW activity) |
| PUT | `/api/admin/requests/:id` | Edit customer info, print preferences, status |
| DELETE | `/api/admin/requests/:id` | Soft delete (`?permanent=true` for hard delete once already in Trash) |
| POST | `/api/admin/requests/:id/restore` | Restore from Trash |
| POST | `/api/admin/requests/:id/print` | Log a print event |
| GET | `/api/admin/trash` | Paginated trash listing |
| GET | `/api/admin/history` | Paginated full history (all statuses) |
| GET | `/api/admin/activity/:request_id` | Activity log for one request |
| GET | `/api/admin/files/:file_id/download` | Secure file download |
| GET | `/api/admin/files/:file_id/preview` | Inline preview (PDF/image only) |

---

## Deployment

### Frontend → Vercel
1. Import the `frontend/` directory as a Vercel project (root directory = `frontend`).
2. Set the environment variable `VITE_API_URL` to your deployed backend URL.
3. Deploy. `vercel.json` includes SPA rewrites so client-side routing works on refresh.

### Backend → Render
1. Create a new Web Service from the `backend/` directory (or use the included `render.yaml` blueprint).
2. Build command: `pip install -r requirements.txt`
3. Start command: `flask db upgrade && gunicorn wsgi:app`
4. Set all backend environment variables listed above, including `CORS_ORIGINS` pointing to your Vercel domain.

### Database → Supabase / Neon / Render PostgreSQL
Create a managed PostgreSQL instance and set `DATABASE_URL` on the backend service accordingly.

### File Storage → Supabase Storage or any S3-compatible service
Set `STORAGE_PROVIDER=s3` and the corresponding credentials on the backend service. Never set storage credentials in the frontend.

### Custom Domain
```
Custom Domain (e.g. printflow.in)
        │
        ▼
      DNS (CNAME/A records)
        │
        ▼
     Vercel
```
The application does not hardcode any domain name — it always reads `VITE_API_URL` and `CORS_ORIGINS` from environment variables, so it works equally well on the free `*.vercel.app` / `*.onrender.com` URLs or a purchased custom domain.

---

## Security Notes

- Passwords hashed with Werkzeug's `generate_password_hash` (PBKDF2)
- JWT stored in httpOnly, SameSite cookies (not accessible to JS, mitigates XSS token theft); `Secure` flag enabled in production
- Admin credentials are never present in frontend code — only seeded server-side from environment variables
- CORS restricted to explicit origins from `CORS_ORIGINS`; wildcard origins are never used for authenticated routes
- File extension **and** MIME type validated; a fixed blocklist rejects executable file types (`.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, etc.) regardless of configuration
- Filenames sanitized with `werkzeug.utils.secure_filename`; storage keys use generated UUIDs, never the raw user-supplied name
- SQL injection mitigated by exclusive use of the SQLAlchemy ORM (no raw string-interpolated queries)
- Rate limiting on the public upload endpoint and the admin login endpoint (Flask-Limiter)
- Soft deletion by default; permanent deletion is a separate, explicit, confirmed action
- No secrets committed to source control — `.env` is gitignored, `.env.example` documents required variables

## Future Improvements

The codebase is structured so these can be added without rearchitecting:
- Email / SMS / WhatsApp notifications on status change
- QR code rendering of the request ID
- Online payment and print pricing/invoices
- Printer queue integration
- Multiple admin accounts with role-based permissions
- Analytics dashboards and scheduled reports
- CSV / Excel export of requests

---

## License

Proprietary — for the requesting organization's use. Adapt as needed.
