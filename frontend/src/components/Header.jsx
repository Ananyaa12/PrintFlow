import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Printer, Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Supported Files', href: '/#supported-files' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
          <span className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center">
            <Printer className="w-4.5 h-4.5" size={18} />
          </span>
          PrintFlow
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link to="/admin/login" className="btn-secondary text-sm">
            Admin Login
          </Link>
        </nav>

        <button
          className="md:hidden p-2 text-slate-600"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-2 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/admin/login"
            onClick={() => setOpen(false)}
            className="px-2 py-2.5 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            Admin Login
          </Link>
        </div>
      )}
    </header>
  )
}
