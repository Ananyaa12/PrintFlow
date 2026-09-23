import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  FileEdit,
  Send,
  Cog,
  Printer as PrinterIcon,
  FileText,
  ShieldCheck,
  Zap,
  UserX,
  Search,
  ArrowRight,
  File,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FileUpload from '../components/FileUpload'
import RequestForm from '../components/RequestForm'
import { submitRequest } from '../services/api'
import { useToast } from '../hooks/useToast'

const STEPS = [
  { n: '01', title: 'Upload', desc: 'Choose or drag in the files you need printed.', icon: UploadCloud },
  { n: '02', title: 'Add Details', desc: 'Tell us your name, phone, and printing preferences.', icon: FileEdit },
  { n: '03', title: 'Submit', desc: 'Send your request and get a unique tracking ID.', icon: Send },
  { n: '04', title: 'Admin Processes', desc: 'Our print desk reviews and prepares your files.', icon: Cog },
  { n: '05', title: 'Print', desc: 'Collect your printed documents, ready to go.', icon: PrinterIcon },
]

const FORMATS = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG', 'WEBP', 'TXT']

const FEATURES = [
  { title: 'Fast upload', desc: 'Drag, drop, and submit in under a minute.', icon: Zap },
  { title: 'No account required', desc: 'Skip sign-up entirely — just upload and go.', icon: UserX },
  { title: 'Secure document handling', desc: 'Files are stored safely in private cloud storage.', icon: ShieldCheck },
  { title: 'Easy printing', desc: 'Our team handles the physical printing for you.', icon: PrinterIcon },
  { title: 'Request tracking', desc: 'Track your submission with a unique request ID.', icon: Search },
]

const emptyForm = {
  user_name: '',
  phone: '',
  email: '',
  copies: 1,
  paper_size: 'A4',
  color_mode: 'bw',
  print_sides: 'single',
  orientation: 'portrait',
  notes: '',
}

export default function Home() {
  const [files, setFiles] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const toast = useToast()

  const validate = () => {
    const errs = {}
    if (!form.user_name.trim()) errs.user_name = 'Name is required.'
    if (!form.phone.trim()) errs.phone = 'Phone number is required.'
    else if (form.phone.trim().length < 7) errs.phone = 'Enter a valid phone number.'
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Enter a valid email address.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFileError('')
    if (files.length === 0) {
      setFileError('Please add at least one document.')
      document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (!validate()) return

    setSubmitting(true)
    setProgress(0)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append('files', f))
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))

      const res = await submitRequest(fd, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
      })

      navigate('/success', {
        state: {
          result: res.data,
          fileNames: files.map((f) => f.name),
        },
      })
    } catch (err) {
      toast.error(err.message || 'Upload failed. Please try again.')
      if (err.fields) setErrors(err.fields)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Upload. Submit. Print.
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-lg">
              Send your documents securely and let our printing desk handle the rest.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#upload-section" className="btn-primary text-base px-6 py-3">
                Upload Document
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#how-it-works" className="btn-secondary text-base px-6 py-3">
                How It Works
              </a>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="card p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-brand-500 text-white flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10" />
                </div>
                <p className="font-semibold text-slate-800">Resume.pdf</p>
                <p className="text-xs text-slate-400 mt-1">2.4 MB · Ready to print</p>
                <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div className="h-full w-4/5 bg-emerald-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload + form */}
      <section id="upload-section" className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Submit your documents</h2>
          <p className="text-slate-500 mt-1">No account needed. Just upload and fill in a few details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <FileUpload files={files} setFiles={setFiles} error={fileError} />
          <RequestForm form={form} setForm={setForm} errors={errors} />

          {submitting && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button type="submit" className="btn-primary w-full text-base py-3.5" disabled={submitting}>
            {submitting ? `Uploading… ${progress}%` : 'Submit Documents'}
          </button>
        </form>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {STEPS.map((step) => (
              <div key={step.n} className="card p-5">
                <span className="text-xs font-bold text-brand-500">{step.n}</span>
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center my-3">
                  <step.icon className="w-5 h-5 text-brand-500" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">{step.title}</p>
                <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported formats */}
      <section id="supported-files" className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Supported Formats</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {FORMATS.map((fmt) => (
              <span
                key={fmt}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700"
              >
                <File className="w-4 h-4 text-brand-500" />
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Why PrintFlow</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5 text-center">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mx-auto mb-3">
                  <f.icon className="w-5 h-5 text-brand-500" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">{f.title}</p>
                <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
