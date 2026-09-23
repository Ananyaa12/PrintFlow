import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <FileQuestion className="w-12 h-12 text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-500 mt-1 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  )
}
