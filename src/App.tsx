import { useState, useEffect, useRef } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { AIConfigPanel } from '@/components/AIConfigPanel'
import { ProposalPreview } from '@/components/ProposalPreview'
import { HistoryPage } from '@/components/HistoryPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ProposalData, AIConfig, ProjectInfo, InputMode, TeamRates, CompanyConfig, SavedProposal } from '@/types/proposal'
import { exportToDocx } from '@/lib/docxExporter'
import { generateProposalHTML } from '@/lib/htmlExporter'
import { COMPANIES, DEFAULT_COMPANY } from '@/lib/companies'
import { hashRequirements, checkProposalByHash, getProposalById, saveProposalToDb } from '@/lib/proposalApi'
import {
  FileText, Type, Sparkles, Download, ChevronLeft,
  Key, AlertCircle, CheckCircle2, ExternalLink, Link2, Link2Off,
  Bot, Users, Pencil, Eye, Building2, History, RefreshCw, Copy, Globe,
} from 'lucide-react'

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
  }
}

type AppStep = 'input' | 'generating' | 'preview' | 'history' | 'share'

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [company, setCompany] = useState<CompanyConfig>(DEFAULT_COMPANY)
  const [step, setStep] = useState<AppStep>('input')
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [requirements, setRequirements] = useState('')
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
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [aiProvider, setAiProvider] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [generateNew, setGenerateNew] = useState(true)
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [shareData, setShareData] = useState<{ saved: SavedProposal; company: CompanyConfig } | null>(null)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleAuthStatus, setGoogleAuthStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [showGoogleFields, setShowGoogleFields] = useState(false)
  const [showGooglePopover, setShowGooglePopover] = useState(false)
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)
  const authPopupRef = useRef<Window | null>(null)
  const googlePopoverRef = useRef<HTMLDivElement>(null)

  const updateInfo = (key: keyof ProjectInfo, val: string) =>
    setProjectInfo(prev => ({ ...prev, [key]: val }))

  const updateRate = (key: keyof TeamRates, val: number) =>
    setTeamRates(prev => ({ ...prev, [key]: val }))

  function handleCompanyChange(id: string) {
    const c = COMPANIES.find(x => x.id === id) ?? DEFAULT_COMPANY
    setCompany(c)
    setProjectInfo(prev => ({ ...prev, preparedBy: c.name }))
  }

  // ── Brand CSS vars ─────────────────────────────────────────────────────────
  const brandVars = {
    '--brand': company.brandColor,
    '--brand-50': company.brand50,
    '--brand-100': company.brand100,
    '--brand-200': company.brand200,
    '--brand-700': company.brand700,
  } as React.CSSProperties

  // ── Generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!requirements.trim()) { setError('Please provide project requirements first.'); return }
    if (!projectInfo.projectName.trim()) { setError('Please enter a project name.'); return }
    if (!anthropicKey.trim() && !geminiKey.trim() && !openaiKey.trim()) {
      setError('Please provide at least one API key (Anthropic, Gemini, or OpenAI).')
      setShowKeys(true)
      return
    }

    setError(null)
    setStep('generating')

    // If "generate new" is off, check DB first
    if (!generateNew) {
      setProgress(5); setProgressMsg('Checking saved proposals…')
      const hash = await hashRequirements(requirements, projectInfo.projectName)
      const { found, proposal: cached } = await checkProposalByHash(hash)
      if (found && cached) {
        setProgress(100); setProgressMsg('Found in history!')
        setProposal(cached.proposalData)
        setAiProvider('cached')
        setSavedProposalId(cached.id)
        setIsEditing(false)
        setTimeout(() => setStep('preview'), 500)
        return
      }
    }

    const steps: [number, string][] = [
      [10, 'Analyzing project requirements…'],
      [25, 'Identifying scope and features…'],
      [45, 'Estimating hours with AI efficiency…'],
      [65, 'Calculating team and costs…'],
      [80, 'Generating proposal document…'],
      [90, `Applying ${company.name} format…`],
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < steps.length) { setProgress(steps[i][0]); setProgressMsg(steps[i][1]); i++ }
    }, 1800)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements, projectInfo, aiConfig, teamRates, anthropicKey, geminiKey, openaiKey }),
      })
      clearInterval(interval)
      if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
      const data = await res.json() as { proposal: ProposalData; provider: string }
      setProgress(100); setProgressMsg('Proposal ready!')
      setProposal(data.proposal); setAiProvider(data.provider)
      setIsEditing(false)
      setSavedProposalId(null)

      const hash = await hashRequirements(requirements, projectInfo.projectName)
      const saved = await saveProposalToDb({
        proposalData: data.proposal,
        projectInfo,
        companyId: company.id,
        requirementsHash: hash,
      })

      if (saved) {
        setSavedProposalId(saved.id)
      } else {
        setError('Proposal generated, but it could not be saved to history yet. Share link will appear after history saving works.')
      }

      setTimeout(() => setStep('preview'), 600)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Generation failed')
      setStep('input')
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!proposal) return
    setIsExporting(true)
    try { await exportToDocx(proposal, projectInfo, company) } finally { setIsExporting(false) }
  }

  // ── Share link detection on mount ──────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shareId = params.get('share')
    if (!shareId) return
    getProposalById(shareId)
      .then((saved: SavedProposal | null) => {
        if (!saved) return
        const comp = COMPANIES.find(c => c.id === saved.companyId) ?? DEFAULT_COMPANY
        setShareData({ saved, company: comp })
        setStep('share')
      })
      .catch(() => {})
  }, [])

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
    const url = `${window.location.origin}${window.location.pathname}?share=${savedProposalId}`
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

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Share view (opened via ?share=id link)
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 'share' && shareData) {
    const { saved, company: shareCompany } = shareData
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
                <p className="font-semibold text-sm">{saved.proposalData.project.name}</p>
                <p className="text-xs text-gray-400">{shareCompany.name} · Shared proposal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {googleAuthStatus === 'connected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsCreatingDoc(true)
                    try {
                      const html = generateProposalHTML(saved.proposalData, saved.projectInfo, shareCompany)
                      const res = await fetch('/api/google/create-doc', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ html, title: saved.proposalData.project.name }),
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
                    : <><ExternalLink className="h-4 w-4 mr-2" />Open in Google Docs</>
                  }
                </Button>
              ) : (
                <div className="relative" ref={googlePopoverRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGooglePopover(v => !v)}
                    className="border-gray-300 text-gray-500 hover:bg-gray-50 text-xs gap-1.5"
                  >
                    <Globe className="h-3.5 w-3.5" />Google Docs
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
                      <Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-brand-orange hover:bg-brand-orange/90" onClick={() => { handleConnectGoogle(); setShowGooglePopover(false) }} disabled={!googleClientId || !googleClientSecret}>
                        <Link2 className="h-3.5 w-3.5" />Connect
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <Button
                size="sm"
                onClick={async () => {
                  setIsExporting(true)
                  try { await exportToDocx(saved.proposalData, saved.projectInfo, shareCompany) } finally { setIsExporting(false) }
                }}
                disabled={isExporting}
              >
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
            <ProposalPreview data={saved.proposalData} info={saved.projectInfo} company={shareCompany} />
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
      <HistoryPage
        onBack={() => setStep('input')}
        company={company}
        googleAuthStatus={googleAuthStatus}
        onOpenInGoogleDocs={async (proposalData, info, comp) => {
          setIsCreatingDoc(true)
          try {
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
              <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-brand-orange" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generating Proposal</h2>
            <p className="text-gray-500 mt-1">{progressMsg}</p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-400">{progress}% complete</p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Preview
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 'preview' && proposal) {
    return (
      <div style={brandVars} className="min-h-screen bg-gray-50">
        {/* Toolbar */}
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
              {/* Edit toggle */}
              <Button
                variant={isEditing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={isEditing ? 'bg-brand-orange hover:bg-brand-orange/90' : ''}
              >
                {isEditing
                  ? <><Eye className="h-4 w-4 mr-1.5" />Done Editing</>
                  : <><Pencil className="h-4 w-4 mr-1.5" />Edit</>
                }
              </Button>

              {/* Google Docs */}
              {googleAuthStatus === 'connected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInGoogleDocs}
                  disabled={isCreatingDoc}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  {isCreatingDoc
                    ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-2" />Creating…</>
                    : <><ExternalLink className="h-4 w-4 mr-2" />Open in Google Docs</>
                  }
                </Button>
              ) : (
                <div className="relative" ref={googlePopoverRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGooglePopover(v => !v)}
                    className="border-gray-300 text-gray-500 hover:bg-gray-50 text-xs gap-1.5"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {googleAuthStatus === 'connecting' ? 'Connecting…' : 'Google Docs'}
                  </Button>
                  {showGooglePopover && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-50 space-y-3">
                      <p className="text-xs font-semibold text-gray-700">Connect Google Account</p>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-500">OAuth Client ID</label>
                        <Input
                          type="text"
                          placeholder="….apps.googleusercontent.com"
                          value={googleClientId}
                          onChange={e => setGoogleClientId(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-500">OAuth Client Secret</label>
                        <Input
                          type="password"
                          placeholder="GOCSPX-…"
                          value={googleClientSecret}
                          onChange={e => setGoogleClientSecret(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5 bg-brand-orange hover:bg-brand-orange/90"
                        onClick={() => { handleConnectGoogle(); setShowGooglePopover(false) }}
                        disabled={!googleClientId || !googleClientSecret || googleAuthStatus === 'connecting'}
                      >
                        <Link2 className="h-3.5 w-3.5" />Connect Google Account
                      </Button>
                      <p className="text-xs text-gray-400">Add your app callback URL as <code className="bg-gray-100 px-1 rounded">{`${window.location.origin}/api/google/callback`}</code>.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Share link */}
              {savedProposalId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 text-gray-600"
                >
                  {linkCopied
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Copied!</>
                    : <><Copy className="h-3.5 w-3.5" />Copy Link</>
                  }
                </Button>
              )}

              {/* Download */}
              <Button onClick={handleExport} disabled={isExporting} size="sm">
                {isExporting
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />Exporting…</>
                  : <><Download className="h-4 w-4 mr-2" />Download DOCX</>
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Proposal */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <ProposalPreview
              data={proposal}
              info={projectInfo}
              company={company}
              isEditing={isEditing}
              onUpdate={setProposal}
            />
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-orange flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Proposal Maker</h1>
              <p className="text-xs text-gray-500">{company.name} · AI-Powered Technical Proposals</p>
            </div>
          </div>

          {/* History + Company selector */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setStep('history')} className="gap-1.5 text-gray-600">
              <History className="h-4 w-4" />History
            </Button>
            <div className="h-5 w-px bg-gray-200" />
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Proposal on behalf of</span>
            <div className="relative">
              <select
                value={company.id}
                onChange={e => handleCompanyChange(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm font-semibold rounded-lg border-2 border-brand-orange bg-white text-brand-orange focus:outline-none cursor-pointer"
              >
                {COMPANIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                <svg className="h-3.5 w-3.5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
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
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Project Requirements</h2>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setInputMode('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${inputMode === 'upload' ? 'bg-brand-orange text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Upload File
                  </button>
                  <button
                    onClick={() => setInputMode('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${inputMode === 'text' ? 'bg-brand-orange text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Type className="h-3.5 w-3.5" /> Paste Text
                  </button>
                </div>
              </div>

              {inputMode === 'upload' ? (
                <FileUpload onFilesContent={(text) => setRequirements(text)} isLoading={false} />
              ) : (
                <Textarea
                  placeholder="Paste your project requirements, SRS, PRD, or any project description here…"
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  className="min-h-[280px] font-mono text-sm resize-y"
                />
              )}

              {requirements && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {requirements.split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
                </div>
              )}

              {/* Generate New toggle */}
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
            </div>

            {/* Team Rates — collapsible, below requirements */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <button onClick={() => setShowRates(!showRates)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-orange" />
                  <span className="font-semibold text-sm">Team Rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{showRates ? 'Hide' : 'Edit rates'}</span>
                </div>
              </button>

              {showRates ? (
                <div className="space-y-0 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {(Object.entries(teamRates) as [keyof TeamRates, number][]).map(([role, rate]) => (
                    <div key={role} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-gray-50">
                      <span className="text-sm text-gray-700 font-medium">{role}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">$</span>
                        <Input
                          type="number"
                          min={1}
                          value={rate}
                          onChange={e => updateRate(role, Number(e.target.value))}
                          className="h-7 w-16 text-sm text-center px-1"
                        />
                        <span className="text-xs text-gray-400">/hr</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end px-3 py-2 bg-gray-50">
                    <button
                      onClick={() => setTeamRates(DEFAULT_TEAM_RATES)}
                      className="text-xs text-gray-400 hover:text-brand-orange"
                    >
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

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
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
                  <p className="text-xs text-gray-400">Tries Anthropic → Gemini → OpenAI in order. Keys are session-only, never stored.</p>

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
                        <p className="text-xs text-gray-400">Add <code className="bg-gray-100 px-1 rounded">{`${window.location.origin}/api/google/callback`}</code> as redirect URI in Google Cloud Console.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Click Setup to connect Google for direct Google Docs export.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Effort Reduction — collapsible, default closed */}
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

              {showAIConfig && <AIConfigPanel config={aiConfig} onChange={setAiConfig} />}
            </div>

            {/* Generate */}
            <Button className="w-full h-12 text-base gap-2" onClick={handleGenerate} disabled={false}>
              <Sparkles className="h-5 w-5" />
              Generate Proposal
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
