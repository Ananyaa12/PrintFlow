import { useRef, useState, useCallback } from 'react'
import { UploadCloud, File, X, FileText, Image as ImageIcon } from 'lucide-react'

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'txt']
const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB || 20)

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function iconFor(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ImageIcon
  if (ext === 'txt') return FileText
  return File
}

export default function FileUpload({ files, setFiles, error }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState('')

  const validateAndAdd = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList)
      const valid = []
      let err = ''

      for (const f of incoming) {
        const ext = f.name.split('.').pop()?.toLowerCase()
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
          err = `"${f.name}" is not a supported file type.`
          continue
        }
        if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          err = `"${f.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit.`
          continue
        }
        valid.push(f)
      }

      setLocalError(err)
      if (valid.length) {
        setFiles((prev) => [...prev, ...valid])
      }
    },
    [setFiles]
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    validateAndAdd(e.dataTransfer.files)
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-300'
        }`}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload documents"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          onChange={(e) => {
            validateAndAdd(e.target.files)
            e.target.value = ''
          }}
        />
        <div className="w-14 h-14 mx-auto rounded-full bg-brand-50 flex items-center justify-center mb-4">
          <UploadCloud className="w-7 h-7 text-brand-500" />
        </div>
        <p className="font-semibold text-slate-800">Drag & Drop your documents here</p>
        <p className="text-sm text-slate-500 mt-1">or</p>
        <button
          type="button"
          className="btn-primary mt-3"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          Choose Files
        </button>
        <p className="text-xs text-slate-400 mt-4">
          Supported: PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP, TXT · Max {MAX_FILE_SIZE_MB} MB per file
        </p>
      </div>

      {(localError || error) && (
        <p className="text-sm text-red-600 mt-2" role="alert">
          {localError || error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => {
            const Icon = iconFor(f.name)
            return (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3"
              >
                <Icon className="w-5 h-5 text-brand-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(f.size)} · {f.name.split('.').pop().toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
