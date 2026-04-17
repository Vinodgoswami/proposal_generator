import { useRef, useState, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadedDoc {
  id: string
  name: string
  text: string
  status: 'done' | 'parsing' | 'error'
  error?: string
}

interface FileUploadProps {
  onFilesContent: (payload: { combinedText: string; wordCount: number }) => void
  isLoading: boolean
}

const SUPPORTED = ['.pdf', '.docx', '.txt']

async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) {
    const { parsePDF } = await import('@/lib/fileParser')
    return parsePDF(file)
  }
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/parse', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json() as { error: string }
    throw new Error(err.error)
  }
  const data = await res.json() as { text: string }
  return data.text
}

export function FileUpload({ onFilesContent, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function emitCombined(updated: UploadedDoc[]) {
    const doneDocs = updated.filter(d => d.status === 'done')
    const combined = doneDocs
      .map(d => `=== ${d.name} ===\n${d.text}`)
      .join('\n\n')
    const wordCount = doneDocs.reduce((total, doc) => total + doc.text.split(/\s+/).filter(Boolean).length, 0)
    onFilesContent({ combinedText: combined, wordCount })
  }

  const processFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => SUPPORTED.some(ext => f.name.toLowerCase().endsWith(ext)))
    if (valid.length === 0) return

    // Add pending entries
    const newDocs: UploadedDoc[] = valid.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      text: '',
      status: 'parsing' as const,
    }))

    setDocs(prev => {
      const combined = [...prev, ...newDocs]
      return combined
    })

    // Parse each file
    for (const [i, file] of valid.entries()) {
      const docId = newDocs[i].id
      try {
        const text = await parseFile(file)
        setDocs(prev => {
          const updated = prev.map(d => d.id === docId ? { ...d, text, status: 'done' as const } : d)
          emitCombined(updated)
          return updated
        })
      } catch (e) {
        setDocs(prev =>
          prev.map(d => d.id === docId
            ? { ...d, status: 'error' as const, error: e instanceof Error ? e.message : 'Parse failed' }
            : d
          )
        )
      }
    }
  }, [onFilesContent]) // eslint-disable-line react-hooks/exhaustive-deps

  function removeDoc(id: string) {
    setDocs(prev => {
      const updated = prev.filter(d => d.id !== id)
      emitCombined(updated)
      return updated
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }, [processFiles])

  const hasAnyParsing = docs.some(d => d.status === 'parsing')

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => !isLoading && !hasAnyParsing && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-brand-orange bg-brand-50'
            : 'border-gray-300 hover:border-brand-orange hover:bg-brand-50/40',
          (isLoading || hasAnyParsing) && 'opacity-60 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          className="hidden"
          onChange={e => e.target.files && processFiles(Array.from(e.target.files))}
        />
        <Upload className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm font-semibold text-gray-700">
          {docs.length > 0 ? 'Drop more files or click to add' : 'Drop files here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT · Multiple files supported · Up to 20MB each</p>
      </div>

      {/* File list */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <div
              key={doc.id}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm',
                doc.status === 'done' && 'border-green-200 bg-green-50',
                doc.status === 'parsing' && 'border-brand-200 bg-brand-50',
                doc.status === 'error' && 'border-red-200 bg-red-50',
              )}
            >
              {doc.status === 'parsing' && <Loader2 className="h-4 w-4 text-brand-orange animate-spin shrink-0" />}
              {doc.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
              {doc.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}

              <FileText className="h-4 w-4 text-gray-400 shrink-0" />

              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-medium truncate',
                  doc.status === 'done' && 'text-green-800',
                  doc.status === 'parsing' && 'text-brand-700',
                  doc.status === 'error' && 'text-red-700',
                )}>
                  {doc.name}
                </p>
                {doc.status === 'parsing' && <p className="text-xs text-brand-700/70">Parsing…</p>}
                {doc.status === 'done' && (
                  <p className="text-xs text-green-700/70">
                    {doc.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                  </p>
                )}
                {doc.status === 'error' && <p className="text-xs text-red-600">{doc.error}</p>}
              </div>

              <button
                onClick={e => { e.stopPropagation(); removeDoc(doc.id) }}
                className="shrink-0 rounded p-0.5 hover:bg-black/10 text-gray-400 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {docs.filter(d => d.status === 'done').length > 1 && (
            <p className="text-xs text-gray-500 pl-1">
              {docs.filter(d => d.status === 'done').length} documents will be combined for proposal generation.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
