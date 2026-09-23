import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Eye, Download, Trash2, SlidersHorizontal } from 'lucide-react'
import { listRequests, deleteRequest, downloadFileBlob } from '../services/api'
import { useToast } from '../hooks/useToast'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import { ConfirmModal } from '../components/Modal'

const STATUS_OPTIONS = ['All', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']
const FILE_TYPE_OPTIONS = ['All', 'PDF', 'DOC', 'DOCX', 'Image', 'Other']
const DATE_OPTIONS = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
]
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
]

export default function AdminDocuments() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const search = params.get('search') || ''
  const status = params.get('status') || 'All'
  const fileType = params.get('file_type') || 'All'
  const dateRange = params.get('date_range') || ''
  const sort = params.get('sort') || 'newest'
  const page = Number(params.get('page') || 1)

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const load = useCallback(() => {
    setLoading(true)
    listRequests({
      search: search || undefined,
      status: status !== 'All' ? status : undefined,
      file_type: fileType !== 'All' ? fileType : undefined,
      date_range: dateRange || undefined,
      sort,
      page,
      page_size: 20,
    })
      .then((res) => {
        setItems(res.data.items)
        setPagination(res.data.pagination)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, fileType, dateRange, sort, page])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteRequest(deleteTarget.request_id)
      toast.success(`${deleteTarget.request_id} moved to trash.`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleDownloadFirst = async (item) => {
    try {
      const res = await downloadFileBlob(item.documents?.[0]?.id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = item.documents?.[0]?.original_filename || 'document'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message || 'Download failed.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">Search, filter, and manage all submissions.</p>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by Request ID, name, phone, or file name"
              defaultValue={search}
              onChange={(e) => updateParam('search', e.target.value)}
            />
          </div>
          <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => updateParam('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">File Type</label>
              <select className="input" value={fileType} onChange={(e) => updateParam('file_type', e.target.value)}>
                {FILE_TYPE_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <select className="input" value={dateRange} onChange={(e) => updateParam('date_range', e.target.value)}>
                {DATE_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sort</label>
              <select className="input" value={sort} onChange={(e) => updateParam('sort', e.target.value)}>
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6" label="Loading documents…" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No matching documents found." subtitle="Try adjusting your search or filters." />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Request ID</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Files</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Copies</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">{r.request_id}</td>
                      <td className="px-5 py-3 text-slate-700">{r.user_name}</td>
                      <td className="px-5 py-3 text-slate-500">{r.file_count} files</td>
                      <td className="px-5 py-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-700">{r.copies}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/admin/documents/${r.request_id}`}
                            className="text-brand-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {items.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500">{r.request_id}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="font-medium text-slate-800 mt-1">{r.user_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r.file_count} files · {r.copies} copies · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <Link to={`/admin/documents/${r.request_id}`} className="text-brand-600 text-sm font-medium">
                      View
                    </Link>
                    <button onClick={() => setDeleteTarget(r)} className="text-red-500 text-sm font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={pagination.page} totalPages={pagination.total_pages} onChange={(p) => updateParam('page', p)} />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this request?"
        message={`This will move ${deleteTarget?.request_id} to Trash. You can restore it later.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  )
}
