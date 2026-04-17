import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProposalPreview } from '@/components/ProposalPreview'
import type { SavedProposal, ProposalData, ProjectInfo, CompanyConfig } from '@/types/proposal'
import type { ConceptData } from '@/types/concept'
import type { EstimateData } from '@/types/estimate'
import { resolveCompanyConfig } from '@/lib/companies'
import { listProposals, updateProposalInDb, updateConceptInDb, updateEstimateInDb, deleteProposalFromDb } from '@/lib/proposalApi'
import { exportToDocx } from '@/lib/docxExporter'
import { generateProposalHTML } from '@/lib/htmlExporter'
import {
  ChevronLeft, ChevronRight, Eye,
  Trash2, Pencil, Eye as EyeIcon, Download, ExternalLink,
  History, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Copy,
  TableProperties, Lightbulb, FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ConceptPreview = lazy(async () => {
  const mod = await import('@/components/ConceptPreview')
  return { default: mod.ConceptPreview }
})

interface HistoryPageProps {
  onBack: () => void
  company: CompanyConfig
  googleAuthStatus: 'disconnected' | 'connecting' | 'connected'
  onOpenInGoogleDocs: (proposal: ProposalData, info: ProjectInfo, company: CompanyConfig) => void
  isCreatingDoc: boolean
}

function buildShareUrl(id: string): string {
  return `${window.location.origin}/share/${encodeURIComponent(id)}`
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
    const url = buildShareUrl(saved.id)
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
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{saved.title}</h3>
          {saved.documentType === 'estimate' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-xs font-medium shrink-0">
              <TableProperties className="h-2.5 w-2.5" />Estimate
            </span>
          )}
          {saved.documentType === 'concept' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-xs font-medium shrink-0">
              <Lightbulb className="h-2.5 w-2.5" />Concept
            </span>
          )}
          {(!saved.documentType || saved.documentType === 'proposal') && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 text-xs font-medium shrink-0">
              <FileText className="h-2.5 w-2.5" />Proposal
            </span>
          )}
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
  const docType = saved.documentType ?? 'proposal'
  const [proposal, setProposal] = useState<ProposalData | undefined>(saved.proposalData)
  const [concept, setConcept] = useState<ConceptData | undefined>(saved.conceptData)
  const [estimate, setEstimate] = useState<EstimateData | undefined>(saved.estimateData)
  const [info] = useState<ProjectInfo>(saved.projectInfo)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const company = resolveCompanyConfig(saved.companyId, saved.projectInfo.companySnapshot)

  function handleCopyLink() {
    const url = buildShareUrl(saved.id)
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
    let updated: SavedProposal | null = null
    if (docType === 'proposal' && proposal) {
      updated = await updateProposalInDb(saved.id, proposal, info)
    } else if (docType === 'concept' && concept) {
      updated = await updateConceptInDb(saved.id, concept)
    } else if (docType === 'estimate' && estimate) {
      updated = await updateEstimateInDb(saved.id, estimate)
    }
    setIsSaving(false)
    if (updated) {
      setSavedOk(true)
      onSaved(updated)
      setTimeout(() => setSavedOk(false), 2500)
    }
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      if (docType === 'proposal' && proposal) {
        await exportToDocx(proposal, info, company)
      } else if (docType === 'concept' && concept) {
        const { exportConceptToDocx } = await import('@/lib/docxExporter')
        await exportConceptToDocx(concept, info, company)
      } else if (docType === 'estimate' && estimate) {
        const { exportEstimateToXls } = await import('@/lib/xlsExporter')
        await exportEstimateToXls(estimate)
      }
    } finally { setIsExporting(false) }
  }

  const exportLabel = docType === 'estimate' ? 'Download Excel (.xlsx)' : 'Download DOCX'
  const title = docType === 'proposal' && proposal
    ? proposal.project.name
    : docType === 'concept' && concept
    ? concept.projectName
    : docType === 'estimate' && estimate
    ? estimate.projectName
    : saved.title

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
              <p className="font-semibold text-sm">{title}</p>
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
                  : savedOk
                  ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Saved</>
                  : 'Save Changes'
                }
              </Button>
            )}

            {/* Google Docs — only for proposals */}
            {docType === 'proposal' && googleAuthStatus === 'connected' && proposal && (
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

            {/* Download */}
            <Button onClick={handleExport} disabled={isExporting} size="sm">
              {isExporting
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />Exporting…</>
                : <><Download className="h-4 w-4 mr-2" />{exportLabel}</>
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {docType === 'proposal' && proposal && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <ProposalPreview
              data={proposal}
              info={info}
              company={company}
              isEditing={isEditing}
              onUpdate={setProposal}
            />
          </div>
        )}

        {docType === 'concept' && concept && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <Suspense fallback={<div className="py-10 text-center text-sm text-gray-400">Loading concept…</div>}>
              <ConceptPreview
                data={concept}
                info={info}
                company={company}
                isEditing={isEditing}
                onUpdate={setConcept}
              />
            </Suspense>
          </div>
        )}

        {docType === 'estimate' && estimate && (
          <EstimateDetailView
            estimate={estimate}
            isEditing={isEditing}
            onUpdate={setEstimate}
            company={company}
          />
        )}
      </div>
    </div>
  )
}

// ─── Estimate inline detail ───────────────────────────────────────────────────

function EstimateDetailView({
  estimate,
  isEditing,
  onUpdate,
  company,
}: {
  estimate: EstimateData
  isEditing: boolean
  onUpdate: (e: EstimateData) => void
  company: CompanyConfig
}) {
  function updateHours(featureIdx: number, field: 'designHours' | 'frontendHours' | 'backendHours' | 'qaHours' | 'pmHours', value: number) {
    const newFeatures = estimate.features.map((f, i) => {
      if (i !== featureIdx) return f
      const updated = { ...f, [field]: value }
      updated.totalHours = (updated.designHours || 0) + (updated.frontendHours || 0) + (updated.backendHours || 0) + (updated.qaHours || 0) + (updated.pmHours || 0)
      return updated
    })
    onUpdate({ ...estimate, features: newFeatures })
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {estimate.costingSummary.byPlatform.map((p, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1 font-medium">{p.platform}</p>
            <p className="text-xl font-bold" style={{ color: company.brandColor }}>${p.totalCost.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{p.totalHours}h</p>
          </div>
        ))}
        <div className="rounded-xl p-4 text-center text-white" style={{ backgroundColor: company.brandColor }}>
          <p className="text-xs opacity-80 mb-1 font-medium">Grand Total</p>
          <p className="text-xl font-bold">${estimate.costingSummary.grandTotalCost.toLocaleString()}</p>
          <p className="text-xs opacity-70">{estimate.costingSummary.grandTotalHours}h · {estimate.costingSummary.timeline}</p>
        </div>
      </div>

      {/* Platform tables */}
      {estimate.platforms.map(platform => {
        const features = estimate.features.filter(f => f.platform === platform)
        if (features.length === 0) return null
        const platformSummary = estimate.costingSummary.byPlatform.find(p => p.platform === platform)
        return (
          <div key={platform} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: company.brandColor }}>
              <h3 className="font-bold text-white">{platform}</h3>
              {platformSummary && (
                <span className="text-sm text-white/80">{platformSummary.totalHours}h · ${platformSummary.totalCost.toLocaleString()}</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Module</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Feature</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Design</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Frontend</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Backend</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600">QA</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600">PM</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600 bg-gray-100">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {features.map((feat, i) => {
                    const globalIdx = estimate.features.indexOf(feat)
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium text-gray-700">{feat.module}</td>
                        <td className="px-4 py-2 text-gray-800">
                          {feat.feature}
                          {feat.isSharedBackend && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 border border-blue-200">shared</span>
                          )}
                        </td>
                        {(['designHours', 'frontendHours', 'backendHours', 'qaHours', 'pmHours'] as const).map(field => (
                          <td key={field} className="px-3 py-2 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={feat[field] || 0}
                                onChange={e => updateHours(globalIdx, field, Number(e.target.value))}
                                className="w-12 text-center text-xs rounded border border-gray-300 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                              />
                            ) : (
                              <span className="text-gray-600">{feat[field] || '—'}</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold bg-gray-100" style={{ color: company.brandColor }}>{feat.totalHours}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td colSpan={2} className="px-4 py-2 font-bold text-gray-700 text-right">Subtotal</td>
                    {(['designHours', 'frontendHours', 'backendHours', 'qaHours', 'pmHours'] as const).map(key => (
                      <td key={key} className="px-3 py-2 text-center font-semibold text-gray-700">
                        {features.reduce((a, f) => a + (f[key] || 0), 0) || '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-gray-100" style={{ color: company.brandColor }}>
                      {features.reduce((a, f) => a + f.totalHours, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })}
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
