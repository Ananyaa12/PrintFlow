import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileStack, Clock, Loader2, CheckCircle2, CalendarDays, Eye } from 'lucide-react'
import { getDashboard } from '../services/api'
import { useToast } from '../hooks/useToast'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

const STAT_CARDS = [
  { key: 'total_requests', label: 'Total Requests', icon: FileStack, color: 'bg-brand-50 text-brand-600' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'bg-amber-50 text-amber-600' },
  { key: 'processing', label: 'Processing', icon: Loader2, color: 'bg-blue-50 text-blue-600' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  { key: 'today_requests', label: "Today's Requests", icon: CalendarDays, color: 'bg-purple-50 text-purple-600' },
]

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-7 h-7" label="Loading dashboard…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of all print requests.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map((c) => (
          <div key={c.key} className="card p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="w-4.5 h-4.5" size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{data?.stats?.[c.key] ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Requests</h2>
          <Link to="/admin/documents" className="text-sm text-brand-600 font-medium hover:underline">
            View all
          </Link>
        </div>

        {data?.recent_requests?.length ? (
          <>
            {/* Desktop table */}
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
                  {data.recent_requests.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">{r.request_id}</td>
                      <td className="px-5 py-3 text-slate-700">{r.user_name}</td>
                      <td className="px-5 py-3 text-slate-500">{r.file_count} files</td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-700">{r.copies}</td>
                      <td className="px-5 py-3">
                        <Link
                          to={`/admin/documents/${r.request_id}`}
                          className="inline-flex items-center gap-1 text-brand-600 text-sm font-medium hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {data.recent_requests.map((r) => (
                <Link
                  key={r.id}
                  to={`/admin/documents/${r.request_id}`}
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500">{r.request_id}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="font-medium text-slate-800 mt-1">{r.user_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r.file_count} files · {r.copies} copies
                  </p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="No documents yet." subtitle="Requests submitted by users will show up here." />
        )}
      </div>
    </div>
  )
}
