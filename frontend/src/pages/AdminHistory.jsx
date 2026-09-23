import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listHistory } from '../services/api'
import { useToast } from '../hooks/useToast'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'

export default function AdminHistory() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const search = params.get('search') || ''
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
    listHistory({ search: search || undefined, page, page_size: 20, sort: 'newest' })
      .then((res) => {
        setItems(res.data.items)
        setPagination(res.data.pagination)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">History</h1>
        <p className="text-sm text-slate-500 mt-0.5">Full historical record of every request, persisted in PostgreSQL.</p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by Request ID, name, phone, or file name"
            defaultValue={search}
            onChange={(e) => updateParam('search', e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6" label="Loading history…" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No matching documents found." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Request ID</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Files</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                    <th className="px-5 py-3 font-medium">Completed</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link to={`/admin/documents/${r.request_id}`} className="font-mono text-xs text-brand-600 hover:underline">
                          {r.request_id}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{r.user_name}</td>
                      <td className="px-5 py-3 text-slate-500">{r.file_count} files</td>
                      <td className="px-5 py-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-500">{new Date(r.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.total_pages} onChange={(p) => updateParam('page', p)} />
          </>
        )}
      </div>
    </div>
  )
}
