import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ProposalData, AIConfig, ProjectInfo, TeamRates, CompanyConfig, SavedProposal } from '@/types/proposal'
import type { EstimateData } from '@/types/estimate'
import type { ConceptData } from '@/types/concept'
import { COMPANIES, DEFAULT_COMPANY, createCompanyConfig, resolveCompanyConfig } from '@/lib/companies'
import {
  hashRequirements, checkProposalByHash, getProposalById,
  saveProposalToDb, saveEstimateToDb, saveConceptToDb,
  updateEstimateInDb, updateConceptInDb,
} from '@/lib/proposalApi'
import { encryptKeys } from '@/lib/keyEncryption'
import {
  FileText, Type, Sparkles, Download, ChevronLeft,
  Key, AlertCircle, CheckCircle2, ExternalLink, Link2, Link2Off,
  Bot, Users, Pencil, Eye, Building2, History, RefreshCw, Copy, Globe,
  TableProperties, Lightbulb, X, Loader2,
} from 'lucide-react'

const AIConfigPanel = lazy(async () => {
  const mod = await import('@/components/AIConfigPanel')
  return { default: mod.AIConfigPanel }
})

const ProposalPreview = lazy(async () => {
  const mod = await import('@/components/ProposalPreview')
  return { default: mod.ProposalPreview }
})

const HistoryPage = lazy(async () => {
  const mod = await import('@/components/HistoryPage')
  return { default: mod.HistoryPage }
})

const ConceptPreview = lazy(async () => {
  const mod = await import('@/components/ConceptPreview')
  return { default: mod.ConceptPreview }
})

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_AI_CONFIG: AIConfig = {
  'Setup & Architecture': 0,
  'Frontend Development': 0,
  'Backend Development': 0,
  'API Integration': 0,
  'UI/UX Design': 0,
  'QA & Testing': 0,
  'DevOps & Infra': 0,
  'Documentation': 0,
}

const DEFAULT_TEAM_RATES: TeamRates = {
  'Backend Developer': 20,
  'Frontend Developer': 20,
  'UI/UX Designer': 18,
  'QA Engineer': 15,
  'Project Manager': 25,
  'DevOps Engineer': 20,
}

function defaultProjectInfo(company: CompanyConfig): ProjectInfo {
  return {
    projectName: '',
    clientName: '',
    engagementType: 'Fixed-Price · Phased Delivery',
    preparedBy: company.name,
    version: '1.0',
    companySnapshot: company,
  }
}

type DocumentType = 'proposal' | 'estimate' | 'concept'
type AppStep = 'input' | 'generating' | 'preview' | 'history' | 'share'

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string; description: string }[] = [
  { value: 'proposal', label: 'Proposal', description: 'Full technical proposal with costs, timeline, and architecture' },
  { value: 'estimate', label: 'Estimate', description: 'Split cost estimate by platform exported as Excel (.xlsx)' },
  { value: 'concept', label: 'Concept', description: 'Deep project concept with platform analysis, journeys, and ballpark cost' },
]

function getShareIdFromLocation(location: Location): string | null {
  const pathMatch = location.pathname.match(/^\/share\/([^/]+)$/)
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1])
  const params = new URLSearchParams(location.search)
  return params.get('share')
}

function buildShareUrl(id: string): string {
  return `${window.location.origin}/share/${encodeURIComponent(id)}`
}

function PanelLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-sm text-gray-500">
      {label}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const initialShareId = typeof window !== 'undefined' ? getShareIdFromLocation(window.location) : null
  const [selectedCompanyId, setSelectedCompanyId] = useState(DEFAULT_COMPANY.id)
  const [customCompany, setCustomCompany] = useState<CompanyConfig>(() => createCompanyConfig({
    id: 'custom',
    name: '',
    tagline: '',
    website: '',
    phone: '',
    email: '',
    brandColor: DEFAULT_COMPANY.brandColor,
  }))
  const [documentType, setDocumentType] = useState<DocumentType>('proposal')
  const [step, setStep] = useState<AppStep>(initialShareId ? 'share' : 'input')
  const [uploadedRequirements, setUploadedRequirements] = useState('')
  const [uploadedRequirementsWordCount, setUploadedRequirementsWordCount] = useState(0)
  const [typedRequirements, setTypedRequirements] = useState('')
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(defaultProjectInfo(DEFAULT_COMPANY))
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG)
  const [teamRates, setTeamRates] = useState<TeamRates>(DEFAULT_TEAM_RATES)
  const [anthropicKey, setAnthropicKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [showKeys, setShowKeys] = useState(false)
  const [showAIConfig, setShowAIConfig] = useState(false)
  const [showRates, setShowRates] = useState(false)
  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [estimate, setEstimate] = useState<EstimateData | null>(null)
  const [concept, setConcept] = useState<ConceptData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedError, setCopiedError] = useState(false)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [aiProvider, setAiProvider] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [generateNew, setGenerateNew] = useState(true)
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null)
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null)
  const [savedConceptId, setSavedConceptId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isEditingEstimate, setIsEditingEstimate] = useState(false)
  const [isEditingConcept, setIsEditingConcept] = useState(false)
  const [isSavingEstimate, setIsSavingEstimate] = useState(false)
  const [isSavingConcept, setIsSavingConcept] = useState(false)
  const [estimateSaved, setEstimateSaved] = useState(false)
  const [conceptSaved, setConceptSaved] = useState(false)
  const [shareData, setShareData] = useState<{ saved: SavedProposal; company: CompanyConfig } | null>(null)
  const [shareLookupComplete, setShareLookupComplete] = useState(initialShareId === null)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleAuthStatus, setGoogleAuthStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [showGoogleFields, setShowGoogleFields] = useState(false)
  const [showGooglePopover, setShowGooglePopover] = useState(false)
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)
  const [styleReferenceText, setStyleReferenceText] = useState('')
  const [styleReferenceName, setStyleReferenceName] = useState('')
  const [isParsingStyleReference, setIsParsingStyleReference] = useState(false)
  const authPopupRef = useRef<Window | null>(null)
  const googlePopoverRef = useRef<HTMLDivElement>(null)
  const styleReferenceInputRef = useRef<HTMLInputElement>(null)

  const company = selectedCompanyId === 'custom'
    ? customCompany
    : (COMPANIES.find(item => item.id === selectedCompanyId) ?? DEFAULT_COMPANY)

  const updateInfo = (key: keyof ProjectInfo, val: string) =>
    setProjectInfo(prev => ({ ...prev, [key]: val }))

  const updateRate = (key: keyof TeamRates, val: number) =>
    setTeamRates(prev => ({ ...prev, [key]: val }))

  function buildRequirements() {
    const sections = [
      uploadedRequirements.trim() ? `Uploaded Files\n${uploadedRequirements.trim()}` : '',
      typedRequirements.trim() ? `Additional Notes\n${typedRequirements.trim()}` : '',
    ].filter(Boolean)
    return sections.join('\n\n')
  }

  const requirements = buildRequirements()
  const uploadedWordCount = uploadedRequirementsWordCount
  const typedWordCount = typedRequirements.split(/\s+/).filter(Boolean).length
  const totalWordCount = uploadedWordCount + typedWordCount

  function handleCompanyChange(id: string) {
    setSelectedCompanyId(id)
    const nextCompany = id === 'custom'
      ? customCompany
      : (COMPANIES.find(x => x.id === id) ?? DEFAULT_COMPANY)
    setProjectInfo(prev => ({ ...prev, preparedBy: nextCompany.name, companySnapshot: nextCompany }))
  }

  function updateCustomCompany(field: keyof Pick<CompanyConfig, 'name' | 'tagline' | 'website' | 'phone' | 'email' | 'brandColor'>, value: string) {
    const nextCompany = createCompanyConfig({ ...customCompany, [field]: value })
    setCustomCompany(nextCompany)
    if (selectedCompanyId === 'custom') {
      setProjectInfo(prev => ({ ...prev, preparedBy: nextCompany.name, companySnapshot: nextCompany }))
    }
  }

  async function handleStyleReferenceUpload(file: File) {
    setIsParsingStyleReference(true)
    try {
      const { parseFile: parseReferenceFile } = await import('@/lib/fileParser')
      const text = await parseReferenceFile(file)
      setStyleReferenceText(text)
      setStyleReferenceName(file.name)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to parse reference proposal')
    } finally {
      setIsParsingStyleReference(false)
    }
  }

  // ── Brand CSS vars ─────────────────────────────────────────────────────────
  const brandVars = {
    '--brand': company.brandColor,
    '--brand-50': company.brand50,
    '--brand-100': company.brand100,
    '--brand-200': company.brand200,
    '--brand-700': company.brand700,
  } as React.CSSProperties

  // ── Validate common inputs ─────────────────────────────────────────────────
  function validateInputs(): boolean {
    if (!requirements.trim()) {
      setError('Please add project requirements using file upload, pasted text, or both.')
      return false
    }
    if (!projectInfo.projectName.trim()) {
      setError('Please enter a project name.')
      return false
    }
    // Key validation is handled server-side (Groq key is set via env var)
    return true
  }

  function startProgressLoop(steps: [number, string][]): ReturnType<typeof setInterval> {
    let i = 0
    return setInterval(() => {
      if (i < steps.length) { setProgress(steps[i][0]); setProgressMsg(steps[i][1]); i++ }
    }, 1800)
  }

  // ── Generate Proposal ──────────────────────────────────────────────────────

  async function handleGenerateProposal() {
    setError(null)
    setStep('generating')

    if (!generateNew) {
      setProgress(5); setProgressMsg('Checking saved proposals…')
      const hash = await hashRequirements(requirements, projectInfo.projectName, `${company.id}::${company.name}::${styleReferenceText}`)
      const { found, proposal: cached } = await checkProposalByHash(hash)
      if (found && cached) {
        setProgress(100); setProgressMsg('Found in history!')
        setProposal(cached.proposalData ?? null)
        setAiProvider('cached')
        setSavedProposalId(cached.id)
        setIsEditing(false)
        setTimeout(() => setStep('preview'), 500)
        return
      }
    }

    const interval = startProgressLoop([
      [10, 'Analyzing project requirements…'],
      [25, 'Identifying scope and features…'],
      [45, 'Estimating hours with AI efficiency…'],
      [65, 'Calculating team and costs…'],
      [80, 'Generating proposal document…'],
      [90, `Applying ${company.name} format…`],
    ])

    try {
      const encKeys = await encryptKeys({ anthropicKey, geminiKey, openaiKey })
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          projectInfo: { ...projectInfo, companySnapshot: company },
          aiConfig,
          teamRates,
          companyProfile: company,
          styleReferenceText,
          ...encKeys,
        }),
      })
      clearInterval(interval)
      const data = await res.json().catch(() => { throw new Error('No response from server — the request may have timed out. Try again.') }) as { proposal: ProposalData; provider: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Generation failed')
      setProgress(100); setProgressMsg('Proposal ready!')
      setProposal(data.proposal); setAiProvider(data.provider)
      setIsEditing(false)
      setSavedProposalId(null)

      const hash = await hashRequirements(requirements, projectInfo.projectName, `${company.id}::${company.name}::${styleReferenceText}`)
      const saved = await saveProposalToDb({
        proposalData: data.proposal,
        projectInfo: { ...projectInfo, companySnapshot: company },
        companyId: company.id,
        requirementsHash: hash,
      })
      if (saved) {
        setSavedProposalId(saved.id)
      } else {
        setError('Proposal generated, but it could not be saved to history yet.')
      }
      setTimeout(() => setStep('preview'), 600)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Generation failed')
      setStep('input')
    }
  }

  // ── Generate Estimate ──────────────────────────────────────────────────────

  async function handleGenerateEstimate() {
    setError(null)
    setStep('generating')

    const interval = startProgressLoop([
      [10, 'Analyzing project platforms…'],
      [25, 'Identifying features per platform…'],
      [45, 'Calculating role-based hours…'],
      [65, 'Resolving shared backend modules…'],
      [80, 'Building cost breakdown…'],
      [90, 'Preparing Excel structure…'],
    ])

    try {
      const encKeys = await encryptKeys({ anthropicKey, geminiKey, openaiKey })
      const res = await fetch('/api/generate-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          projectInfo: { ...projectInfo, companySnapshot: company },
          teamRates,
          companyProfile: company,
          ...encKeys,
        }),
      })
      clearInterval(interval)
      const data = await res.json().catch(() => { throw new Error('No response from server — the request may have timed out. Try again.') }) as { estimate: EstimateData; provider: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Estimate generation failed')
      setProgress(100); setProgressMsg('Estimate ready!')
      setEstimate(data.estimate)
      setAiProvider(data.provider)
      setIsEditingEstimate(false)

      const hash = await hashRequirements(requirements, projectInfo.projectName)
      const saved = await saveEstimateToDb({
        estimateData: data.estimate,
        projectInfo: { ...projectInfo, companySnapshot: company },
        companyId: company.id,
        teamRates,
        requirementsHash: hash,
      })
      if (saved) setSavedEstimateId(saved.id)

      setTimeout(() => setStep('preview'), 600)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Estimate generation failed')
      setStep('input')
    }
  }

  // ── Generate Concept ───────────────────────────────────────────────────────

  async function handleGenerateConcept() {
    setError(null)
    setStep('generating')

    const interval = startProgressLoop([
      [10, 'Analyzing project idea…'],
      [25, 'Mapping platforms and users…'],
      [45, 'Designing user journeys…'],
      [65, 'Outlining architecture…'],
      [80, 'Estimating ballpark scope…'],
      [90, 'Finalizing concept document…'],
    ])

    try {
      const encKeys = await encryptKeys({ anthropicKey, geminiKey, openaiKey })
      const res = await fetch('/api/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          projectInfo: { ...projectInfo, companySnapshot: company },
          companyProfile: company,
          ...encKeys,
        }),
      })
      clearInterval(interval)
      const data = await res.json().catch(() => { throw new Error('No response from server — the request may have timed out. Try again.') }) as { concept: ConceptData; provider: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Concept generation failed')
      setProgress(100); setProgressMsg('Concept ready!')
      setConcept(data.concept)
      setAiProvider(data.provider)
      setIsEditingConcept(false)

      const hash = await hashRequirements(requirements, projectInfo.projectName)
      const saved = await saveConceptToDb({
        conceptData: data.concept,
        projectInfo: { ...projectInfo, companySnapshot: company },
        companyId: company.id,
        requirementsHash: hash,
      })
      if (saved) setSavedConceptId(saved.id)

      setTimeout(() => setStep('preview'), 600)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Concept generation failed')
      setStep('input')
    }
  }

  async function handleGenerate() {
    if (!validateInputs()) return
    setEstimate(null); setConcept(null); setProposal(null)
    setSavedEstimateId(null); setSavedConceptId(null); setSavedProposalId(null)
    if (documentType === 'proposal') await handleGenerateProposal()
    else if (documentType === 'estimate') await handleGenerateEstimate()
    else await handleGenerateConcept()
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async function handleExportProposal() {
    if (!proposal) return
    setIsExporting(true)
    try {
      const { exportToDocx } = await import('@/lib/docxExporter')
      await exportToDocx(proposal, projectInfo, company)
    } finally { setIsExporting(false) }
  }

  async function handleExportEstimate() {
    if (!estimate) return
    setIsExporting(true)
    try {
      const { exportEstimateToXls } = await import('@/lib/xlsExporter')
      await exportEstimateToXls(estimate)
    } finally { setIsExporting(false) }
  }

  async function handleSaveEstimateChanges() {
    if (!estimate || !savedEstimateId) return
    setIsSavingEstimate(true)
    const updated = await updateEstimateInDb(savedEstimateId, estimate)
    setIsSavingEstimate(false)
    if (updated) {
      setEstimateSaved(true)
      setTimeout(() => setEstimateSaved(false), 2500)
    }
  }

  async function handleSaveConceptChanges() {
    if (!concept || !savedConceptId) return
    setIsSavingConcept(true)
    const updated = await updateConceptInDb(savedConceptId, concept)
    setIsSavingConcept(false)
    if (updated) {
      setConceptSaved(true)
      setTimeout(() => setConceptSaved(false), 2500)
    }
  }

  function handleCopyEstimateLink() {
    if (!savedEstimateId) return
    const url = buildShareUrl(savedEstimateId)
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  function handleCopyConceptLink() {
    if (!savedConceptId) return
    const url = buildShareUrl(savedConceptId)
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  async function handleExportConcept() {
    if (!concept) return
    setIsExporting(true)
    try {
      const { exportConceptToDocx } = await import('@/lib/docxExporter')
      await exportConceptToDocx(concept, projectInfo, company)
    } finally { setIsExporting(false) }
  }

  // ── Share link detection on mount ──────────────────────────────────────────

  useEffect(() => {
    const shareId = initialShareId
    if (!shareId) return
    getProposalById(shareId)
      .then((saved: SavedProposal | null) => {
        if (!saved) { setShareLookupComplete(true); return }
        const comp = resolveCompanyConfig(saved.companyId, saved.projectInfo.companySnapshot)
        setShareData({ saved, company: comp })
        setStep('share')
        setShareLookupComplete(true)
      })
      .catch(() => setShareLookupComplete(true))
  }, [initialShareId])

  // ── Popover click-outside ──────────────────────────────────────────────────

  useEffect(() => {
    if (!showGooglePopover) return
    function handler(e: MouseEvent) {
      if (googlePopoverRef.current && !googlePopoverRef.current.contains(e.target as Node)) {
        setShowGooglePopover(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showGooglePopover])

  // ── Copy share link ────────────────────────────────────────────────────────

  function handleCopyLink() {
    if (!savedProposalId) return
    const url = buildShareUrl(savedProposalId)
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  // ── Google Docs ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/google/status')
      .then(r => r.json())
      .then((d: { authenticated: boolean }) => { if (d.authenticated) setGoogleAuthStatus('connected') })
      .catch(() => {})

    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'google-auth-success') { setGoogleAuthStatus('connected'); authPopupRef.current?.close() }
      else if (e.data?.type === 'google-auth-error') { setGoogleAuthStatus('disconnected'); authPopupRef.current?.close() }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function handleConnectGoogle() {
    if (!googleClientId.trim() || !googleClientSecret.trim()) { setShowGoogleFields(true); return }
    setGoogleAuthStatus('connecting')
    try {
      const res = await fetch('/api/google/auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: googleClientId, clientSecret: googleClientSecret }),
      })
      const { url } = await res.json() as { url: string }
      const popup = window.open(url, 'google-auth', 'width=500,height=650,left=200,top=100')
      authPopupRef.current = popup
      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll)
          fetch('/api/google/status')
            .then(r => r.json())
            .then((d: { authenticated: boolean }) => setGoogleAuthStatus(d.authenticated ? 'connected' : 'disconnected'))
            .catch(() => setGoogleAuthStatus('disconnected'))
        }
      }, 500)
    } catch { setGoogleAuthStatus('disconnected') }
  }

  async function handleDisconnectGoogle() {
    await fetch('/api/google/revoke', { method: 'POST' })
    setGoogleAuthStatus('disconnected')
  }

  async function handleOpenInGoogleDocs() {
    if (!proposal) return
    setIsCreatingDoc(true)
    try {
      const { generateProposalHTML } = await import('@/lib/htmlExporter')
      const html = generateProposalHTML(proposal, projectInfo, company)
      const res = await fetch('/api/google/create-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, title: proposal.project.name }),
      })
      if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
      const { docUrl } = await res.json() as { docUrl: string }
      window.open(docUrl, '_blank')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create Google Doc')
    } finally { setIsCreatingDoc(false) }
  }

  // ── Error auto-dismiss ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!error) return
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(null), 5000)
    return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current) }
  }, [error])

  function handleCopyError() {
    if (!error) return
    navigator.clipboard.writeText(error).then(() => {
      setCopiedError(true)
      setTimeout(() => setCopiedError(false), 2000)
    })
  }

  // ── Generate button label ──────────────────────────────────────────────────
  const generateLabel =
    documentType === 'estimate' ? 'Generate Estimate'
    : documentType === 'concept' ? 'Generate Concept'
    : 'Generate Proposal'

  const generateIcon =
    documentType === 'estimate' ? <TableProperties className="h-5 w-5" />
    : documentType === 'concept' ? <Lightbulb className="h-5 w-5" />
    : <Sparkles className="h-5 w-5" />

  const generatingLabel =
    documentType === 'estimate' ? 'Generating Estimate'
    : documentType === 'concept' ? 'Generating Concept'
    : 'Generating Proposal'

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Share view
  // ──────────────────────────────────────────────────────────────────────────

  if (initialShareId && !shareLookupComplete) {
    return (
      <div style={brandVars} className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <PanelLoader label="Loading shared proposal..." />
        </div>
      </div>
    )
  }

  if (initialShareId && !shareData) {
    return (
      <div style={brandVars} className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 rounded-xl border border-red-200 bg-white p-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Shared Proposal Not Found</h1>
          <p className="text-sm text-gray-500">This shared proposal link is invalid, expired, or no longer available.</p>
        </div>
      </div>
    )
  }

  if (step === 'share' && shareData) {
    const { saved, company: shareCompany } = shareData
    const shareDocType = saved.documentType ?? 'proposal'
    const shareTitle = shareDocType === 'concept' && saved.conceptData
      ? saved.conceptData.projectName
      : shareDocType === 'estimate' && saved.estimateData
      ? saved.estimateData.projectName
      : saved.proposalData?.project.name ?? saved.title
    const shareSubtitle = shareDocType === 'estimate' ? 'Shared estimate'
      : shareDocType === 'concept' ? 'Shared concept'
      : 'Shared proposal'
    const shareBrandVars = {
      '--brand': shareCompany.brandColor,
      '--brand-50': shareCompany.brand50,
      '--brand-100': shareCompany.brand100,
      '--brand-200': shareCompany.brand200,
      '--brand-700': shareCompany.brand700,
    } as React.CSSProperties

    return (
      <div style={shareBrandVars} className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-brand-orange flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{shareTitle}</p>
                <p className="text-xs text-gray-400">{shareCompany.name} · {shareSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {shareDocType === 'proposal' && saved.proposalData && googleAuthStatus === 'connected' && (
                <Button
                  variant="outline" size="sm"
                  onClick={async () => {
                    setIsCreatingDoc(true)
                    try {
                      const { generateProposalHTML } = await import('@/lib/htmlExporter')
                      const html = generateProposalHTML(saved.proposalData!, saved.projectInfo, shareCompany)
                      const res = await fetch('/api/google/create-doc', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ html, title: saved.proposalData!.project.name }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      const { docUrl } = await res.json() as { docUrl: string }
                      window.open(docUrl, '_blank')
                    } finally { setIsCreatingDoc(false) }
                  }}
                  disabled={isCreatingDoc}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  {isCreatingDoc
                    ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-2" />Creating…</>
                    : <><ExternalLink className="h-4 w-4 mr-2" />Open in Google Docs</>}
                </Button>
              )}
              <Button
                size="sm"
                onClick={async () => {
                  setIsExporting(true)
                  try {
                    if (shareDocType === 'estimate' && saved.estimateData) {
                      const { exportEstimateToXls } = await import('@/lib/xlsExporter')
                      await exportEstimateToXls(saved.estimateData)
                    } else if (shareDocType === 'concept' && saved.conceptData) {
                      const { exportConceptToDocx } = await import('@/lib/docxExporter')
                      await exportConceptToDocx(saved.conceptData, saved.projectInfo, shareCompany)
                    } else if (saved.proposalData) {
                      const { exportToDocx } = await import('@/lib/docxExporter')
                      await exportToDocx(saved.proposalData, saved.projectInfo, shareCompany)
                    }
                  } finally { setIsExporting(false) }
                }}
                disabled={isExporting}
              >
                {isExporting
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />Exporting…</>
                  : <><Download className="h-4 w-4 mr-2" />{shareDocType === 'estimate' ? 'Download Excel (.xlsx)' : 'Download DOCX'}</>}
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <Suspense fallback={<PanelLoader label="Loading…" />}>
              {shareDocType === 'proposal' && saved.proposalData && (
                <ProposalPreview data={saved.proposalData} info={saved.projectInfo} company={shareCompany} />
              )}
              {shareDocType === 'concept' && saved.conceptData && (
                <ConceptPreview data={saved.conceptData} info={saved.projectInfo} company={shareCompany} />
              )}
              {shareDocType === 'estimate' && saved.estimateData && (
                <div className="text-sm text-gray-500 text-center py-8">Download the Excel file above to view the full estimate.</div>
              )}
            </Suspense>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: History
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 'history') {
    return (
      <Suspense fallback={<div style={brandVars} className="min-h-screen bg-gray-50 p-6"><PanelLoader label="Loading history..." /></div>}>
        <HistoryPage
          onBack={() => setStep('input')}
          company={company}
          googleAuthStatus={googleAuthStatus}
          onOpenInGoogleDocs={async (proposalData, info, comp) => {
            setIsCreatingDoc(true)
            try {
              const { generateProposalHTML } = await import('@/lib/htmlExporter')
              const html = generateProposalHTML(proposalData, info, comp)
              const res = await fetch('/api/google/create-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html, title: proposalData.project.name }),
              })
              if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
              const { docUrl } = await res.json() as { docUrl: string }
              window.open(docUrl, '_blank')
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed to create Google Doc')
            } finally { setIsCreatingDoc(false) }
          }}
          isCreatingDoc={isCreatingDoc}
        />
      </Suspense>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Generating
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 'generating') {
    return (
      <div style={brandVars} className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-brand-100 border-t-brand-orange animate-spin" />
              {documentType === 'estimate'
                ? <TableProperties className="absolute inset-0 m-auto h-8 w-8 text-brand-orange" />
                : documentType === 'concept'
                  ? <Lightbulb className="absolute inset-0 m-auto h-8 w-8 text-brand-orange" />
                  : <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-brand-orange" />
              }
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{generatingLabel}</h2>
            <p className="text-gray-500 mt-1">{progressMsg}</p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-400">{progress}% complete</p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Preview — Proposal
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 'preview' && proposal && documentType === 'proposal') {
    return (
      <div style={brandVars} className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('input')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="h-5 w-px bg-gray-200" />
              <div>
                <p className="font-semibold text-sm">{proposal.project.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {aiProvider === 'cached' ? '⟲ From History' : aiProvider === 'anthropic' ? '✦ Claude' : aiProvider === 'gemini' ? '✦ Gemini' : '✦ GPT-4o'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {proposal.costEstimation.summary.totalAIReducedHours}h · ${proposal.costEstimation.summary.totalCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={isEditing ? 'default' : 'outline'} size="sm" onClick={() => setIsEditing(!isEditing)} className={isEditing ? 'bg-brand-orange hover:bg-brand-orange/90' : ''}>
                {isEditing ? <><Eye className="h-4 w-4 mr-1.5" />Done Editing</> : <><Pencil className="h-4 w-4 mr-1.5" />Edit</>}
              </Button>
              {googleAuthStatus === 'connected' ? (
                <Button variant="outline" size="sm" onClick={handleOpenInGoogleDocs} disabled={isCreatingDoc} className="border-green-300 text-green-700 hover:bg-green-50">
                  {isCreatingDoc ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-2" />Creating…</> : <><ExternalLink className="h-4 w-4 mr-2" />Open in Google Docs</>}
                </Button>
              ) : (
                <div className="relative" ref={googlePopoverRef}>
                  <Button variant="outline" size="sm" onClick={() => setShowGooglePopover(v => !v)} className="border-gray-300 text-gray-500 hover:bg-gray-50 text-xs gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {googleAuthStatus === 'connecting' ? 'Connecting…' : 'Google Docs'}
                  </Button>
                  {showGooglePopover && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-50 space-y-3">
                      <p className="text-xs font-semibold text-gray-700">Connect Google Account</p>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-500">OAuth Client ID</label>
                        <Input type="text" placeholder="….apps.googleusercontent.com" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} className="text-xs h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-500">OAuth Client Secret</label>
                        <Input type="password" placeholder="GOCSPX-…" value={googleClientSecret} onChange={e => setGoogleClientSecret(e.target.value)} className="text-xs h-8" />
                      </div>
                      <Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-brand-orange hover:bg-brand-orange/90" onClick={() => { handleConnectGoogle(); setShowGooglePopover(false) }} disabled={!googleClientId || !googleClientSecret || googleAuthStatus === 'connecting'}>
                        <Link2 className="h-3.5 w-3.5" />Connect Google Account
                      </Button>
                      <p className="text-xs text-gray-400">Add your app callback URL as <code className="bg-gray-100 px-1 rounded">{`${window.location.origin}/api/google/callback`}</code>.</p>
                    </div>
                  )}
                </div>
              )}
              {savedProposalId && (
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 text-gray-600">
                  {linkCopied ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
                </Button>
              )}
              <Button onClick={handleExportProposal} disabled={isExporting} size="sm">
                {isExporting ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />Exporting…</> : <><Download className="h-4 w-4 mr-2" />Download DOCX</>}
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <Suspense fallback={<PanelLoader label="Loading proposal preview..." />}>
              <ProposalPreview data={proposal} info={projectInfo} company={company} isEditing={isEditing} onUpdate={setProposal} />
            </Suspense>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Preview — Estimate
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 'preview' && estimate && documentType === 'estimate') {
    return (
      <div style={brandVars} className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('input')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="h-5 w-px bg-gray-200" />
              <div>
                <p className="font-semibold text-sm">{estimate.projectName} — Cost Estimate</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {aiProvider === 'anthropic' ? '✦ Claude' : aiProvider === 'gemini' ? '✦ Gemini' : '✦ GPT-4o'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {estimate.costingSummary.grandTotalHours}h · ${estimate.costingSummary.grandTotalCost.toLocaleString()} · {estimate.costingSummary.timeline}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={isEditingEstimate ? 'default' : 'outline'} size="sm" onClick={() => setIsEditingEstimate(!isEditingEstimate)} className={isEditingEstimate ? 'bg-brand-orange hover:bg-brand-orange/90' : ''}>
                {isEditingEstimate ? <><Eye className="h-4 w-4 mr-1.5" />Done Editing</> : <><Pencil className="h-4 w-4 mr-1.5" />Edit</>}
              </Button>
              {isEditingEstimate && (
                <Button size="sm" onClick={handleSaveEstimateChanges} disabled={isSavingEstimate} variant="outline" className="border-green-400 text-green-700 hover:bg-green-50">
                  {isSavingEstimate ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : estimateSaved ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Saved</> : 'Save Changes'}
                </Button>
              )}
              {savedEstimateId && (
                <Button variant="outline" size="sm" onClick={handleCopyEstimateLink} className="gap-1.5 text-gray-600">
                  {linkCopied ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
                </Button>
              )}
              <Button onClick={handleExportEstimate} disabled={isExporting} size="sm" className="gap-2">
                {isExporting
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Exporting…</>
                  : <><Download className="h-4 w-4" />Download Excel (.xlsx)</>}
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {estimate.costingSummary.byPlatform.map((p, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1 font-medium">{p.platform}</p>
                <p className="text-xl font-bold text-brand-orange">${p.totalCost.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{p.totalHours}h</p>
              </div>
            ))}
            <div className="bg-brand-orange rounded-xl p-4 text-center text-white">
              <p className="text-xs opacity-80 mb-1 font-medium">Grand Total</p>
              <p className="text-xl font-bold">${estimate.costingSummary.grandTotalCost.toLocaleString()}</p>
              <p className="text-xs opacity-70">{estimate.costingSummary.grandTotalHours}h · {estimate.costingSummary.timeline}</p>
            </div>
          </div>

          {/* Platform breakdown tables */}
          {estimate.platforms.map(platform => {
            const features = estimate.features.filter(f => f.platform === platform)
            if (features.length === 0) return null
            const platformSummary = estimate.costingSummary.byPlatform.find(p => p.platform === platform)
            return (
              <div key={platform} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-brand-orange px-5 py-3 flex items-center justify-between">
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
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Description</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Design</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Frontend</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Backend</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600">QA</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600">PM</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600 bg-brand-50">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {features.map((feat, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-medium text-gray-700">{feat.module}</td>
                          <td className="px-4 py-2 text-gray-800">
                            {feat.feature}
                            {feat.isSharedBackend && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 border border-blue-200">shared</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-500 max-w-[180px]">
                            <span className="line-clamp-2">{feat.description}</span>
                            {feat.sharedNote && <span className="block text-blue-500 text-xs mt-0.5">{feat.sharedNote}</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">{feat.designHours || '—'}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{feat.frontendHours || '—'}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{feat.backendHours || '—'}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{feat.qaHours || '—'}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{feat.pmHours || '—'}</td>
                          <td className="px-3 py-2 text-center font-semibold text-brand-orange bg-brand-50">{feat.totalHours}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 border-t-2 border-gray-300">
                        <td colSpan={3} className="px-4 py-2 font-bold text-gray-700 text-right">Subtotal</td>
                        {(['designHours', 'frontendHours', 'backendHours', 'qaHours', 'pmHours'] as const).map(key => (
                          <td key={key} className="px-3 py-2 text-center font-semibold text-gray-700">
                            {features.reduce((a, f) => a + (f[key] || 0), 0) || '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-bold text-brand-orange bg-brand-50">
                          {features.reduce((a, f) => a + f.totalHours, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
            <p className="font-semibold mb-1">About Shared Backend Modules</p>
            <p>Features marked <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 border border-blue-200 font-medium">shared</span> reuse backend work developed for another platform. Only setup/integration hours are counted for the second platform to avoid double-counting development cost.</p>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleExportEstimate} disabled={isExporting} size="lg" className="gap-2 h-12 px-8">
              {isExporting
                ? <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />Preparing Excel…</>
                : <><Download className="h-5 w-5" />Download Full Excel Estimate (.xlsx)</>}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Preview — Concept
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 'preview' && concept && documentType === 'concept') {
    return (
      <div style={brandVars} className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('input')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="h-5 w-px bg-gray-200" />
              <div>
                <p className="font-semibold text-sm">{concept.projectName} — Concept</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {aiProvider === 'anthropic' ? '✦ Claude' : aiProvider === 'gemini' ? '✦ Gemini' : '✦ GPT-4o'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {concept.targetPlatforms.length} platforms · {concept.keyFeatures.length} features
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={isEditingConcept ? 'default' : 'outline'} size="sm" onClick={() => setIsEditingConcept(!isEditingConcept)} className={isEditingConcept ? 'bg-brand-orange hover:bg-brand-orange/90' : ''}>
                {isEditingConcept ? <><Eye className="h-4 w-4 mr-1.5" />Done Editing</> : <><Pencil className="h-4 w-4 mr-1.5" />Edit</>}
              </Button>
              {isEditingConcept && (
                <Button size="sm" onClick={handleSaveConceptChanges} disabled={isSavingConcept} variant="outline" className="border-green-400 text-green-700 hover:bg-green-50">
                  {isSavingConcept ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : conceptSaved ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Saved</> : 'Save Changes'}
                </Button>
              )}
              {savedConceptId && (
                <Button variant="outline" size="sm" onClick={handleCopyConceptLink} className="gap-1.5 text-gray-600">
                  {linkCopied ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
                </Button>
              )}
              <Button onClick={handleExportConcept} disabled={isExporting} size="sm">
                {isExporting
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />Exporting…</>
                  : <><Download className="h-4 w-4 mr-2" />Download DOCX</>}
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <Suspense fallback={<PanelLoader label="Loading concept..." />}>
              <ConceptPreview data={concept} info={projectInfo} company={company} isEditing={isEditingConcept} onUpdate={setConcept} />
            </Suspense>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Input
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div style={brandVars} className="min-h-screen bg-gray-50">
      {/* ── Error toast ── */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-white shadow-lg px-4 py-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-red-700 leading-snug">{error}</p>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCopyError}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
                title="Copy error"
              >
                {copiedError ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedError ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setError(null)}
                className="rounded-md p-1 text-red-400 hover:bg-red-50 transition-colors"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header — simplified, company selector moved to Project Info */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-orange flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Proposal Maker</h1>
              <p className="text-xs text-gray-500">{company.name} · AI-Powered Technical Documents</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStep('history')} className="gap-1.5 text-gray-600">
            <History className="h-4 w-4" />History
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Project Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Project Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input id="projectName" placeholder="e.g. Shunya Gaming Engine" value={projectInfo.projectName} onChange={e => updateInfo('projectName', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientName">Client / Prepared For</Label>
                  <Input id="clientName" placeholder="e.g. Shunya Platform" value={projectInfo.clientName} onChange={e => updateInfo('clientName', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engagementType">Engagement Type</Label>
                  <Input id="engagementType" placeholder="Fixed-Price · Phased Delivery" value={projectInfo.engagementType} onChange={e => updateInfo('engagementType', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="documentType">Document Type</Label>
                  <div className="relative">
                    <select
                      id="documentType"
                      value={documentType}
                      onChange={e => setDocumentType(e.target.value as DocumentType)}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 cursor-pointer"
                    >
                      {DOCUMENT_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {DOCUMENT_TYPE_OPTIONS.find(o => o.value === documentType)?.description}
                  </p>
                </div>
                {/* 5th field: Proposal on behalf of */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    Proposal on Behalf of
                  </Label>
                  <div className="relative">
                    <select
                      value={company.id}
                      onChange={e => handleCompanyChange(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm font-semibold rounded-lg border-2 border-brand-orange bg-white text-brand-orange focus:outline-none cursor-pointer"
                    >
                      {COMPANIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      <option value="custom">{customCompany.name.trim() || 'Custom Company'}</option>
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                      <svg className="h-3.5 w-3.5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedCompanyId === 'custom' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Custom Company Branding</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customCompanyName">Company Name *</Label>
                    <Input id="customCompanyName" placeholder="e.g. Acme Corp" value={customCompany.name} onChange={e => updateCustomCompany('name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customCompanyTagline">Tagline</Label>
                    <Input id="customCompanyTagline" placeholder="e.g. Building the future, together" value={customCompany.tagline} onChange={e => updateCustomCompany('tagline', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customCompanyWebsite">Website</Label>
                    <Input id="customCompanyWebsite" placeholder="e.g. www.acmecorp.com" value={customCompany.website} onChange={e => updateCustomCompany('website', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customCompanyPhone">Phone</Label>
                    <Input id="customCompanyPhone" placeholder="e.g. +1 800 000 0000" value={customCompany.phone} onChange={e => updateCustomCompany('phone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customCompanyEmail">Email</Label>
                    <Input id="customCompanyEmail" placeholder="e.g. hello@acmecorp.com" value={customCompany.email} onChange={e => updateCustomCompany('email', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customCompanyColor">Brand Color</Label>
                    <div className="flex items-center gap-3">
                      <Input id="customCompanyColor" type="color" value={customCompany.brandColor} onChange={e => updateCustomCompany('brandColor', e.target.value)} className="h-10 w-16 p-1" />
                      <Input value={customCompany.brandColor} onChange={e => updateCustomCompany('brandColor', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Previous Proposal Reference</Label>
                  <input
                    ref={styleReferenceInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) void handleStyleReferenceUpload(file)
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={() => styleReferenceInputRef.current?.click()} disabled={isParsingStyleReference}>
                      {isParsingStyleReference ? 'Parsing Reference…' : 'Upload Previous Proposal'}
                    </Button>
                    {styleReferenceName && <span className="text-sm text-gray-500 truncate">{styleReferenceName}</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    Upload an older proposal from this company to guide tone, brand voice, structure, and style.
                  </p>
                  {styleReferenceText && (
                    <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                      {(styleReferenceText.split(/\s+/).filter(Boolean).length).toLocaleString()} reference words loaded from previous proposal.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requirements */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Project Requirements</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
                    <FileText className="h-3.5 w-3.5" /> Upload optional
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                    <Type className="h-3.5 w-3.5" /> Text optional
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Upload Files</Label>
                  <FileUpload
                    onFilesContent={({ combinedText, wordCount }) => {
                      setUploadedRequirements(combinedText)
                      setUploadedRequirementsWordCount(wordCount)
                    }}
                    isLoading={false}
                  />
                  <p className="text-xs text-gray-500">
                    Upload one file or multiple files. All successfully parsed files are combined.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirementsText" className="text-xs font-semibold text-gray-700">Paste Additional Text</Label>
                  <Textarea
                    id="requirementsText"
                    placeholder="Paste your project requirements, SRS, PRD, notes, or clarifications here."
                    value={typedRequirements}
                    onChange={e => setTypedRequirements(e.target.value)}
                    className="min-h-[220px] font-mono text-sm resize-y"
                  />
                </div>
              </div>

              {requirements && (
                <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-xs text-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{totalWordCount.toLocaleString()} words ready for {documentType} generation</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6 text-green-700">
                    {uploadedRequirements && <span>{uploadedWordCount.toLocaleString()} words from uploaded files</span>}
                    {typedRequirements && <span>{typedWordCount.toLocaleString()} words from pasted text</span>}
                  </div>
                </div>
              )}

              {/* Generate New toggle — only relevant for Proposal (has caching) */}
              {documentType === 'proposal' && (
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">Generate new proposal</span>
                    <span className="text-xs text-gray-400">
                      {generateNew ? 'Always generate fresh' : 'Reuse from history if available'}
                    </span>
                  </div>
                  <button
                    onClick={() => setGenerateNew(v => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${generateNew ? 'bg-brand-orange' : 'bg-gray-300'}`}
                    role="switch"
                    aria-checked={generateNew}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${generateNew ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Team Rates */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <button onClick={() => setShowRates(!showRates)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-orange" />
                  <span className="font-semibold text-sm">Team Rates</span>
                </div>
                <span className="text-xs text-gray-400">{showRates ? 'Hide' : 'Edit rates'}</span>
              </button>

              {showRates ? (
                <div className="space-y-0 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {(Object.entries(teamRates) as [keyof TeamRates, number][]).map(([role, rate]) => (
                    <div key={role} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-gray-50">
                      <span className="text-sm text-gray-700 font-medium">{role}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">$</span>
                        <Input type="number" min={1} value={rate} onChange={e => updateRate(role, Number(e.target.value))} className="h-7 w-16 text-sm text-center px-1" />
                        <span className="text-xs text-gray-400">/hr</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end px-3 py-2 bg-gray-50">
                    <button onClick={() => setTeamRates(DEFAULT_TEAM_RATES)} className="text-xs text-gray-400 hover:text-brand-orange">
                      Reset to defaults
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {(Object.entries(teamRates) as [keyof TeamRates, number][]).map(([role, rate]) => (
                    <div key={role} className="flex items-center justify-between px-3 py-2 bg-white">
                      <span className="text-sm text-gray-600">{role}</span>
                      <span className="text-sm font-semibold text-brand-orange">${rate}/hr</span>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">

            {/* API Keys */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <button onClick={() => setShowKeys(!showKeys)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-brand-orange" />
                  <span className="font-semibold text-sm">API Keys</span>
                </div>
                <div className="flex items-center gap-2">
                  {(anthropicKey || geminiKey || openaiKey) && <Badge variant="default" className="text-xs">Configured</Badge>}
                  <span className="text-xs text-gray-400">{showKeys ? 'Hide' : 'Show'}</span>
                </div>
              </button>

              {showKeys && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="anthropicKey">Anthropic (Claude) — Primary</Label>
                    <Input id="anthropicKey" type="password" placeholder="sk-ant-…" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="geminiKey">Google Gemini — Fallback 1</Label>
                    <Input id="geminiKey" type="password" placeholder="AIza…" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="openaiKey">OpenAI (GPT-4o) — Fallback 2</Label>
                    <Input id="openaiKey" type="password" placeholder="sk-…" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} />
                  </div>
                  <p className="text-xs text-gray-400">Tries Anthropic → Gemini → OpenAI → Groq (server) in order. Client keys are session-only, never stored. Groq runs automatically as a free fallback — no key required here.</p>

                  {/* Google Docs */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-700">Google Docs Export</Label>
                      {googleAuthStatus === 'connected' ? (
                        <button onClick={handleDisconnectGoogle} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                          <Link2Off className="h-3 w-3" />Disconnect
                        </button>
                      ) : (
                        <button onClick={() => setShowGoogleFields(!showGoogleFields)} className="text-xs text-gray-400 hover:text-gray-600">
                          {showGoogleFields ? 'Hide' : 'Setup'}
                        </button>
                      )}
                    </div>
                    {googleAuthStatus === 'connected' ? (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />Google account connected
                      </div>
                    ) : googleAuthStatus === 'connecting' ? (
                      <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-3 py-2">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
                        Waiting for Google authorization…
                      </div>
                    ) : showGoogleFields ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor="googleClientId" className="text-xs">OAuth Client ID</Label>
                          <Input id="googleClientId" type="password" placeholder="….apps.googleusercontent.com" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} className="text-xs h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="googleClientSecret" className="text-xs">OAuth Client Secret</Label>
                          <Input id="googleClientSecret" type="password" placeholder="GOCSPX-…" value={googleClientSecret} onChange={e => setGoogleClientSecret(e.target.value)} className="text-xs h-8" />
                        </div>
                        <Button size="sm" variant="outline" className="w-full text-xs h-8 border-brand-orange text-brand-orange hover:bg-brand-50" onClick={handleConnectGoogle} disabled={!googleClientId || !googleClientSecret}>
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />Connect Google Account
                        </Button>
                        <p className="text-xs text-gray-400">Add <code className="bg-gray-100 px-1 rounded">{`${window.location.origin}/api/google/callback`}</code> as redirect URI.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Click Setup to connect Google for direct Google Docs export.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Effort Reduction — only shown for Proposal mode */}
            {documentType === 'proposal' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <button onClick={() => setShowAIConfig(!showAIConfig)} className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-brand-orange" />
                    <span className="font-semibold text-sm">AI Effort Reduction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.values(aiConfig).some(v => v > 0) && (
                      <Badge variant="default" className="text-xs">
                        Avg {Math.round(Object.values(aiConfig).reduce((a, b) => a + b, 0) / 8)}%
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">{showAIConfig ? 'Hide' : 'Configure'}</span>
                  </div>
                </button>
                {!showAIConfig && (
                  <p className="text-xs text-gray-400">
                    Configure how much AI tools reduce dev hours per category.
                    {Object.values(aiConfig).every(v => v === 0) && ' Currently set to 0% (no AI reduction).'}
                  </p>
                )}
                {showAIConfig && (
                  <Suspense fallback={<PanelLoader label="Loading AI settings..." />}>
                    <AIConfigPanel config={aiConfig} onChange={setAiConfig} />
                  </Suspense>
                )}
              </div>
            )}

            {/* Generate */}
            <Button className="w-full h-12 text-base gap-2" onClick={handleGenerate}>
              {generateIcon}
              {generateLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
