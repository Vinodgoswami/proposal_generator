import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProposalPreview } from '@/components/ProposalPreview'
import type { SavedProposal, ProposalData, ProjectInfo, CompanyConfig } from '@/types/proposal'
import { resolveCompanyConfig } from '@/lib/companies'
import { listProposals, updateProposalInDb, deleteProposalFromDb } from '@/lib/proposalApi'
import { exportToDocx } from '@/lib/docxExporter'
import { generateProposalHTML } from '@/lib/htmlExporter'
import {
  ChevronLeft, ChevronRight, Clock, DollarSign, Eye,
  Trash2, Pencil, Eye as EyeIcon, Download, ExternalLink,
  History, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Copy,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface HistoryPageProps {
  onBack: () => void
  company: CompanyConfig
  googleAuthStatus: 'disconnected' | 'connecting' | 'connected'
  onOpenInGoogleDocs: (proposal: ProposalData, info: ProjectInfo, company: CompanyConfig) => void
  isCreatingDoc: boolean
}

// ─── List card ───────────────────────────────────────────────────────────────

function ProposalCard({
  saved,
  onView,
  onDelete,
}: {
  saved: SavedProposal
  onView: () => void
  onDelete: () => void
}) {
  const company = resolveCompanyConfig(saved.companyId, saved.projectInfo.companySnapshot)
  const date = new Date(saved.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const [confirming, setConfirming] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}${window.location.pathname}?share=${saved.id}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  return (
    <div
      className="bg-white rounded-xl border px-5 py-4 flex items-center gap-5 hover:shadow-sm transition-shadow"
      style={{ borderColor: company.brandColor, borderLeftWidth: '3px' }}
    >
      {/* Color dot */}
      <span
        className="inline-block h-3 w-3 rounded-full shrink-0"
        style={{ background: company.brandColor }}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 grid grid-cols-1 gap-0.5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{saved.title}</h3>
          <span className="text-xs text-gray-300 shrink-0">·</span>
          <span className="text-xs text-gray-400 shrink-0">{company.name}</span>
          <span className="text-xs text-gray-300 shrink-0">·</span>
          <span className="text-xs text-gray-400 shrink-0">{date}</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{saved.description}</p>
      </div>

      {/* Cost + Timeline */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-xs text-gray-400">Cost</p>
          <p className="text-sm font-bold text-gray-800">{formatCurrency(saved.totalCost)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Timeline</p>
          <p className="text-sm text-gray-700">{saved.timeline}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={onView}
          className="h-8 text-xs gap-1.5"
          style={{ backgroundColor: company.brandColor }}
        >
          <Eye className="h-3.5 w-3.5" />
          View Detail
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyLink}
          className="h-8 text-xs gap-1.5"
          style={{ borderColor: company.brandColor, color: company.brandColor }}
        >
          {linkCopied
            ? <><CheckCircle2 className="h-3.5 w-3.5" />Copied!</>
            : <><Copy className="h-3.5 w-3.5" />Share</>
          }
        </Button>
        {confirming ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={async () => { await onDelete(); setConfirming(false) }}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500" onClick={() => setConfirming(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function DetailView({
  saved,
  onBack,
  onSaved,
  googleAuthStatus,
  onOpenInGoogleDocs,
  isCreatingDoc,
}: {
  saved: SavedProposal
  onBack: () => void
  onSaved: (updated: SavedProposal) => void
  googleAuthStatus: 'disconnected' | 'connecting' | 'connected'
  onOpenInGoogleDocs: (proposal: ProposalData, info: ProjectInfo, company: CompanyConfig) => void
  isCreatingDoc: boolean
}) {
  const [proposal, setProposal] = useState<ProposalData>(saved.proposalData)
  const [info] = useState<ProjectInfo>(saved.projectInfo)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved2, setSaved2] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const company = resolveCompanyConfig(saved.companyId, saved.projectInfo.companySnapshot)

  function handleCopyLink() {
    const url = `${window.location.origin}${window.location.pathname}?share=${saved.id}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  const brandVars = {
    '--brand': company.brandColor,
    '--brand-50': company.brand50,
    '--brand-100': company.brand100,
    '--brand-200': company.brand200,
    '--brand-700': company.brand700,
  } as React.CSSProperties

  async function handleSave() {
    setIsSaving(true)
    const updated = await updateProposalInDb(saved.id, proposal, info)
    setIsSaving(false)
    if (updated) {
      setSaved2(true)
      onSaved(updated)
      setTimeout(() => setSaved2(false), 2500)
    }
  }

  async function handleExport() {
    setIsExporting(true)
    try { await exportToDocx(proposal, info, company) } finally { setIsExporting(false) }
  }

  return (
    <div style={brandVars} className="min-h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> History
            </Button>
            <div className="h-5 w-px bg-gray-200" />
            <div>
              <p className="font-semibold text-sm">{proposal.project.name}</p>
              <p className="text-xs text-gray-500">
                {new Date(saved.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                {saved.updatedAt !== saved.createdAt && ' · edited'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit toggle */}
            <Button
              variant={isEditing ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditing(e => !e)}
              className={isEditing ? 'bg-brand-orange hover:bg-brand-orange/90' : ''}
            >
              {isEditing
                ? <><EyeIcon className="h-4 w-4 mr-1.5" />Done Editing</>
                : <><Pencil className="h-4 w-4 mr-1.5" />Edit</>
              }
            </Button>

            {/* Save changes */}
            {isEditing && (
              <Button size="sm" onClick={handleSave} disabled={isSaving} variant="outline" className="border-green-400 text-green-700 hover:bg-green-50">
                {isSaving
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>
                  : saved2
                  ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Saved</>
                  : 'Save Changes'
                }
              </Button>
            )}

            {/* Google Docs */}
            {googleAuthStatus === 'connected' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenInGoogleDocs(proposal, info, company)}
                disabled={isCreatingDoc}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                {isCreatingDoc
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-2" />Creating…</>
                  : <><ExternalLink className="h-4 w-4 mr-2" />Open in Google Docs</>
                }
              </Button>
            )}

            {/* Share link */}
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 text-gray-600">
              {linkCopied
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Copied!</>
                : <><Copy className="h-3.5 w-3.5" />Copy Link</>
              }
            </Button>

            {/* Download DOCX */}
            <Button onClick={handleExport} disabled={isExporting} size="sm">
              {isExporting
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />Exporting…</>
                : <><Download className="h-4 w-4 mr-2" />Download DOCX</>
              }
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <ProposalPreview
            data={proposal}
            info={info}
            company={company}
            isEditing={isEditing}
            onUpdate={setProposal}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main HistoryPage ─────────────────────────────────────────────────────────

export function HistoryPage({ onBack, company, googleAuthStatus, onOpenInGoogleDocs, isCreatingDoc }: HistoryPageProps) {
  const [proposals, setProposals] = useState<SavedProposal[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<SavedProposal | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listProposals(p)
      setProposals(result.proposals)
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setPage(result.page)
    } catch {
      setError('Failed to load proposal history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  async function handleDelete(id: string) {
    await deleteProposalFromDb(id)
    load(page)
  }

  if (detail) {
    return (
      <DetailView
        saved={detail}
        onBack={() => setDetail(null)}
        onSaved={updated => setDetail(updated)}
        googleAuthStatus={googleAuthStatus}
        onOpenInGoogleDocs={onOpenInGoogleDocs}
        isCreatingDoc={isCreatingDoc}
      />
    )
  }

  const brandVars = {
    '--brand': company.brandColor,
    '--brand-50': company.brand50,
    '--brand-100': company.brand100,
    '--brand-200': company.brand200,
    '--brand-700': company.brand700,
  } as React.CSSProperties

  return (
    <div style={brandVars} className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <h1 className="font-bold text-lg">Proposal History</h1>
              {total > 0 && <Badge variant="secondary">{total}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading history…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <History className="h-12 w-12 opacity-30" />
            <p className="text-base">No proposals saved yet.</p>
            <p className="text-sm">Generate your first proposal to see it here.</p>
            <Button variant="outline" className="mt-2" onClick={onBack}>Go back</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {proposals.map(p => (
                <ProposalCard
                  key={p.id}
                  saved={p}
                  onView={() => setDetail(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => load(p)}
                      className={cn(
                        'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                        p === page
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => load(page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
