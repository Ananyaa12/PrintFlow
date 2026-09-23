import { Clock, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'

const CONFIG = {
  PENDING: { label: 'Pending', icon: Clock, classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSING: { label: 'Processing', icon: Loader2, classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  DELETED: { label: 'Deleted', icon: Trash2, classes: 'bg-red-50 text-red-700 border-red-200' },
}

export default function StatusBadge({ status, className = '' }) {
  const cfg = CONFIG[status] || CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classes} ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  )
}

export { CONFIG as STATUS_CONFIG }
