import { Loader2 } from 'lucide-react'

export default function Spinner({ className = 'w-5 h-5', label }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-500">
      <Loader2 className={`animate-spin ${className}`} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}
