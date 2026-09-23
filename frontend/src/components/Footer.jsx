import { Printer } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center">
            <Printer size={15} />
          </span>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-none">PrintFlow</p>
            <p className="text-xs text-slate-500 mt-1">Simple Document Submission & Printing</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">© 2026 PrintFlow. All rights reserved.</p>
      </div>
    </footer>
  )
}
