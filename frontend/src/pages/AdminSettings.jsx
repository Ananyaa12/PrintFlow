import { useAuth } from '../hooks/useAuth'

const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB || 20)
const SUPPORTED_TYPES = ['PDF', 'DOC', 'DOCX', 'JPG', 'JPEG', 'PNG', 'WEBP', 'TXT']

export default function AdminSettings() {
  const { admin } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Profile and system configuration.</p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Admin Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="label">Username</p>
            <p className="text-sm text-slate-800">{admin?.username}</p>
          </div>
          <div>
            <p className="label">Email</p>
            <p className="text-sm text-slate-800">{admin?.email}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          To change your password, update it directly in the database or via a future self-service flow. Contact your
          system administrator.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Default Printing Preferences</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label">Default Paper Size</p>
            <p className="text-slate-800">A4</p>
          </div>
          <div>
            <p className="label">Default Color Mode</p>
            <p className="text-slate-800">Black & White</p>
          </div>
          <div>
            <p className="label">Default Sides</p>
            <p className="text-slate-800">Single-sided</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          These defaults are configured on the backend and applied automatically on the public upload form.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Upload Limits</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label">Maximum Upload Size</p>
            <p className="text-slate-800">{MAX_FILE_SIZE_MB} MB per file</p>
          </div>
          <div>
            <p className="label">Supported File Types</p>
            <p className="text-slate-800">{SUPPORTED_TYPES.join(', ')}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Configured via <code className="bg-slate-100 px-1 py-0.5 rounded">MAX_FILE_SIZE_MB</code> and{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded">ALLOWED_FILE_TYPES</code> environment variables on the
          backend.
        </p>
      </div>
    </div>
  )
}
