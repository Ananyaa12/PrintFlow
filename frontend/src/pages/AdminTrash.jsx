import { useEffect, useState, useCallback } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { listTrash, restoreRequest, deleteRequest } from '../services/api'
import { useToast } from '../hooks/useToast'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import { ConfirmModal } from '../components/Modal'

export default function AdminTrash() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [permanentTarget, setPermanentTarget] = useState(null)
  const [processing, setProcessing] = useState(false)
  const toast = useToast()

  const load = useCallback(() => {
    setLoading(true)
    listTrash({ page, page_size: 20 })
      .then((res) => {
        setItems(res.data.items)
        setPagination(res.data.pagination)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const handleRestore = async (item) => {
    try {
      await restoreRequest(item.request_id)
      toast.success(`${item.request_id} restored.`)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handlePermanentDelete = async () => {
    if (!permanentTarget) return
    setProcessing(true)
    try {
      await deleteRequest(permanentTarget.request_id, true)
      toast.success(`${permanentTarget.request_id} permanently deleted.`)
      setPermanentTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Trash</h1>
        <p className="text-sm text-slate-500 mt-0.5">Deleted requests are kept here until permanently removed.</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6" label="Loading trash…" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Trash2} title="Trash is empty." subtitle="Deleted requests will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Request ID</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Deleted Date</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">{r.request_id}</td>
                      <td className="px-5 py-3 text-slate-700">{r.user_name}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {r.deleted_at ? new Date(r.deleted_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleRestore(r)}
                            className="text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </button>
                          <button
                            onClick={() => setPermanentTarget(r)}
                            className="text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.total_pages} onChange={setPage} />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!permanentTarget}
        onClose={() => setPermanentTarget(null)}
        onConfirm={handlePermanentDelete}
        title="Permanently delete this request?"
        message="This permanently removes the record and associated files. This action cannot be undone."
        confirmLabel="Delete Permanently"
        danger
        loading={processing}
      />
    </div>
  )
}
