import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Download,
  Printer,
  Trash2,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Eye,
} from 'lucide-react'
import {
  getRequest,
  updateRequest,
  deleteRequest,
  markPrinted,
  getActivity,
  downloadFileBlob,
  previewFileBlob,
} from '../services/api'
import { useToast } from '../hooks/useToast'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import { Modal, ConfirmModal } from '../components/Modal'

const STATUS_VALUES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function iconFor(mime) {
  if (mime?.startsWith('image/')) return ImageIcon
  if (mime === 'application/pdf') return FileText
  return FileIcon
}

export default function AdminDocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [data, setData] = useState(null)
  const [form, setForm] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getRequest(id), getActivity(id)])
      .then(([reqRes, actRes]) => {
        setData(reqRes.data)
        setForm(reqRes.data)
        setActivity(actRes.data.items)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        user_name: form.user_name,
        phone: form.phone,
        email: form.email,
        copies: Number(form.copies),
        paper_size: form.paper_size,
        color_mode: form.color_mode,
        print_sides: form.print_sides,
        orientation: form.orientation,
        notes: form.notes,
        status: form.status,
      }
      const res = await updateRequest(id, payload)
      setData(res.data)
      setForm(res.data)
      toast.success('Request updated successfully.')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteRequest(id)
      toast.success('Moved to trash.')
      navigate('/admin/documents')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleDownload = async (doc) => {
    try {
      const res = await downloadFileBlob(doc.id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = doc.original_filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message || 'Download failed.')
    }
  }

  const openPreview = async (doc) => {
    const previewable = doc.mime_type?.startsWith('image/') || doc.mime_type === 'application/pdf'
    if (!previewable) {
      setPreviewDoc(doc)
      setPreviewUrl(null)
      return
    }
    try {
      const res = await previewFileBlob(doc.id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: doc.mime_type }))
      setPreviewUrl(url)
      setPreviewDoc(doc)
    } catch (err) {
      toast.error(err.message || 'Preview failed.')
    }
  }

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewDoc(null)
  }

  const handlePrint = async (doc) => {
    try {
      await markPrinted(id)
      const res = await downloadFileBlob(doc.id)
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: doc.mime_type }))
      const win = window.open(blobUrl, '_blank')
      if (win) {
        win.onload = () => win.print()
      }
      toast.success('Print event recorded. Use your browser print dialog to select a printer.')
    } catch (err) {
      toast.error(err.message || 'Could not open print preview.')
    }
  }

  if (loading || !form) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-7 h-7" label="Loading request…" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 font-mono">{data.request_id}</h1>
          <p className="text-sm text-slate-500">Submitted {new Date(data.created_at).toLocaleString()}</p>
        </div>
        <StatusBadge status={form.status} />
      </div>

      {/* Request info + edit form */}
      <div className="card p-5 sm:p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Request Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Customer Name</label>
            <input className="input" value={form.user_name} onChange={(e) => update('user_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
              {STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="font-semibold text-slate-900 pt-2">Printing Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Copies</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.copies}
              onChange={(e) => update('copies', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Paper Size</label>
            <select className="input" value={form.paper_size} onChange={(e) => update('paper_size', e.target.value)}>
              {['A4', 'A3', 'Letter', 'Legal'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Color</label>
            <select className="input" value={form.color_mode} onChange={(e) => update('color_mode', e.target.value)}>
              <option value="bw">Black & White</option>
              <option value="color">Color</option>
            </select>
          </div>
          <div>
            <label className="label">Sides</label>
            <select className="input" value={form.print_sides} onChange={(e) => update('print_sides', e.target.value)}>
              <option value="single">Single-sided</option>
              <option value="double">Double-sided</option>
            </select>
          </div>
          <div>
            <label className="label">Orientation</label>
            <select className="input" value={form.orientation} onChange={(e) => update('orientation', e.target.value)}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Customer Notes</label>
          <textarea
            rows={3}
            className="input resize-none"
            value={form.notes || ''}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn-danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4" />
            Delete Request
          </button>
        </div>
      </div>

      {/* Files */}
      <div className="card p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Files ({data.documents.length})</h2>
        <ul className="space-y-2">
          {data.documents.map((doc) => {
            const Icon = iconFor(doc.mime_type)
            return (
              <li
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 border border-slate-200 rounded-xl px-4 py-3"
              >
                <Icon className="w-5 h-5 text-brand-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.original_filename}</p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(doc.file_size)} · {doc.mime_type}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => openPreview(doc)}>
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => handleDownload(doc)}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => handlePrint(doc)}>
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Activity log */}
      <div className="card p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Activity Log</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-400">No activity recorded yet.</p>
        ) : (
          <ol className="relative border-l border-slate-200 ml-2 space-y-4">
            {activity.map((a) => (
              <li key={a.id} className="ml-4">
                <div className="absolute w-2 h-2 bg-brand-500 rounded-full -left-1 mt-1.5" />
                <p className="text-sm font-medium text-slate-800 capitalize">{a.action.replace('_', ' ').toLowerCase()}</p>
                <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this request?"
        message="This will move the request to Trash. You can restore it later from there."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />

      <Modal open={!!previewDoc} onClose={closePreview} title={previewDoc?.original_filename || 'Preview'} size="lg">
        {previewDoc && previewUrl ? (
          previewDoc.mime_type === 'application/pdf' ? (
            <iframe src={previewUrl} title="Document preview" className="w-full h-[70vh] rounded-lg border border-slate-200" />
          ) : (
            <img src={previewUrl} alt={previewDoc.original_filename} className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
          )
        ) : (
          <div className="text-center py-10">
            <p className="text-slate-600 font-medium">Preview unavailable</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">This file type can't be previewed in the browser.</p>
            {previewDoc && (
              <button className="btn-primary" onClick={() => handleDownload(previewDoc)}>
                <Download className="w-4 h-4" /> Download File
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
