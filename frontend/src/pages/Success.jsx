import { useState } from 'react'
import { useLocation, Navigate, Link } from 'react-router-dom'
import { CheckCircle2, Copy, Check, FileText, RotateCcw } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'

const PAPER_LABELS = { A4: 'A4', A3: 'A3', Letter: 'Letter', Legal: 'Legal' }
const COLOR_LABELS = { bw: 'Black & White', color: 'Color' }
const SIDES_LABELS = { single: 'Single-sided', double: 'Double-sided' }

export default function Success() {
  const location = useLocation()
  const [copied, setCopied] = useState(false)

  const result = location.state?.result
  const fileNames = location.state?.fileNames || []

  if (!result) {
    return <Navigate to="/" replace />
  }

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(result.request_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable; fail silently, UI still shows the ID
    }
  }

  const submittedAt = result.created_at ? new Date(result.created_at) : new Date()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-16">
        <div className="card p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Successful!</h1>
          <p className="text-slate-500 mt-1">Your documents have been submitted successfully.</p>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Your Request ID</p>
            <p className="text-2xl font-bold text-brand-600 mt-1 font-mono">{result.request_id}</p>
            <button onClick={copyId} className="btn-secondary mt-3 text-sm">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Request ID'}
            </button>
          </div>

          <div className="mt-6 text-left space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Files</p>
              <ul className="space-y-1.5">
                {fileNames.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-sm text-slate-700">
                    <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400">Copies</p>
                <p className="text-sm font-medium text-slate-700">{result.copies}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Paper Size</p>
                <p className="text-sm font-medium text-slate-700">{PAPER_LABELS[result.paper_size]}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Color Mode</p>
                <p className="text-sm font-medium text-slate-700">{COLOR_LABELS[result.color_mode]}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Sides</p>
                <p className="text-sm font-medium text-slate-700">{SIDES_LABELS[result.print_sides]}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Submitted</p>
                <p className="text-sm font-medium text-slate-700">{submittedAt.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <Link to="/" className="btn-primary w-full mt-8">
            <RotateCcw className="w-4 h-4" />
            Submit Another Document
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
