import type { ProposalData, ProjectInfo, Risk, CompanyConfig } from '@/types/proposal'
import { DEFAULT_COMPANY } from '@/lib/companies'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle2, TrendingDown, DollarSign, Clock, Trash2, RotateCcw } from 'lucide-react'

interface ProposalPreviewProps {
  data: ProposalData
  info: ProjectInfo
  company?: CompanyConfig
  isEditing?: boolean
  onUpdate?: (updated: ProposalData) => void
}

// ─── Editable primitives ──────────────────────────────────────────────────────

function EText({
  value, isEditing, onSave, className = '',
}: { value: string; isEditing: boolean; onSave: (v: string) => void; className?: string }) {
  if (!isEditing) return <span className={className}>{value}</span>
  return (
    <input
      className={`border-b border-brand-orange bg-brand-50/60 px-1 outline-none rounded-sm w-full ${className}`}
      defaultValue={value}
      onBlur={e => { if (e.target.value !== value) onSave(e.target.value) }}
    />
  )
}

function EArea({
  value, isEditing, onSave, className = '',
}: { value: string; isEditing: boolean; onSave: (v: string) => void; className?: string }) {
  if (!isEditing) return <p className={`text-sm leading-relaxed text-gray-700 ${className}`}>{value}</p>
  return (
    <textarea
      className={`border border-brand-orange bg-brand-50/60 px-2 py-1 outline-none rounded w-full text-sm resize-y min-h-[72px] ${className}`}
      defaultValue={value}
      onBlur={e => { if (e.target.value !== value) onSave(e.target.value) }}
    />
  )
}

// List rendered as bullet points; textarea (newlines) in edit mode
function EList({
  items, isEditing, onSave, className = '',
}: { items: string[]; isEditing: boolean; onSave: (v: string[]) => void; className?: string }) {
  if (!isEditing) {
    return (
      <ul className={`list-disc list-inside space-y-1 ${className}`}>
        {items.map((f, i) => <li key={i} className="text-sm text-gray-700">{f}</li>)}
      </ul>
    )
  }
  return (
    <textarea
      className="border border-brand-orange bg-brand-50/60 px-2 py-1 outline-none rounded w-full text-sm resize-y min-h-[80px]"
      defaultValue={items.join('\n')}
      onBlur={e => {
        const next = e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
        onSave(next)
      }}
    />
  )
}

function ENum({
  value, isEditing, onSave, prefix = '', suffix = '', className = '',
}: { value: number; isEditing: boolean; onSave: (v: number) => void; prefix?: string; suffix?: string; className?: string }) {
  if (!isEditing) return <span className={className}>{prefix}{value}{suffix}</span>
  return (
    <span className="inline-flex items-center gap-0.5">
      {prefix}
      <input
        type="number"
        className={`border-b border-brand-orange bg-brand-50/60 outline-none w-16 text-center rounded-sm ${className}`}
        defaultValue={value}
        onBlur={e => { const n = Number(e.target.value); if (!isNaN(n) && n !== value) onSave(n) }}
      />
      {suffix}
    </span>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function OrangeHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-brand-orange text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-t">
      {children}
    </div>
  )
}

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
      <span className="text-gray-700">{num} · </span>{title}
    </h2>
  )
}

function SubTitle({ text }: { text: string }) {
  return <h3 className="text-base font-bold text-brand-orange mt-5 mb-2">{text}</h3>
}

function OrangeTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-orange">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-white font-semibold text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-brand-50' : 'bg-white'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-gray-800 text-xs align-top border-b border-gray-100">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RiskBadge({ level, isEditing, onSave }: { level: string; isEditing: boolean; onSave: (v: string) => void }) {
  const colors: Record<string, string> = {
    High: 'bg-red-100 text-red-700 border-red-300',
    Medium: 'bg-brand-100 text-brand-700 border-brand-200',
    Low: 'bg-green-100 text-green-700 border-green-300',
  }
  if (!isEditing) {
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${colors[level] || 'bg-gray-100 text-gray-700'}`}>{level}</span>
  }
  return (
    <select
      className="border border-brand-orange bg-brand-50/60 rounded text-xs px-1 py-0.5 outline-none"
      defaultValue={level}
      onChange={e => onSave(e.target.value)}
    >
      {['Low', 'Medium', 'High'].map(v => <option key={v}>{v}</option>)}
    </select>
  )
}

// ─── Section wrapper with delete button ──────────────────────────────────────

function SectionWrapper({
  sectionKey, isEditing, isHidden, onDelete, onRestore, children,
}: {
  sectionKey: string
  isEditing: boolean
  isHidden: boolean
  onDelete: () => void
  onRestore: () => void
  children: React.ReactNode
}) {
  if (isHidden) {
    if (!isEditing) return null
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 flex items-center justify-between bg-gray-50 text-sm text-gray-400">
        <span>Section hidden</span>
        <button onClick={onRestore} className="flex items-center gap-1 text-xs text-brand-orange hover:underline">
          <RotateCcw className="h-3 w-3" /> Restore
        </button>
      </div>
    )
  }
  return (
    <div className="relative group">
      {isEditing && (
        <button
          onClick={onDelete}
          className="absolute -top-1 -right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-md bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 px-2 py-1 text-xs font-medium"
        >
          <Trash2 className="h-3 w-3" /> Delete section
        </button>
      )}
      {children}
    </div>
  )
}

// ─── Deep-clone + set helpers ─────────────────────────────────────────────────

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ─── Main component ───────────────────────────────────────────────────────────

export function ProposalPreview({ data, info, company = DEFAULT_COMPANY, isEditing = false, onUpdate }: ProposalPreviewProps) {
  const { executiveSummary: es, costEstimation: ce } = data
  const hidden = new Set(data.hiddenSections ?? [])

  function patch(updater: (d: ProposalData) => void) {
    if (!onUpdate) return
    const next = clone(data)
    updater(next)
    onUpdate(next)
  }

  function deleteSection(key: string) {
    patch(d => {
      d.hiddenSections = [...(d.hiddenSections ?? []), key]
    })
  }

  function restoreSection(key: string) {
    patch(d => {
      d.hiddenSections = (d.hiddenSections ?? []).filter(k => k !== key)
    })
  }

  function sec(key: string, children: React.ReactNode) {
    return (
      <SectionWrapper
        key={key}
        sectionKey={key}
        isEditing={isEditing}
        isHidden={hidden.has(key)}
        onDelete={() => deleteSection(key)}
        onRestore={() => restoreSection(key)}
      >
        {children}
      </SectionWrapper>
    )
  }

  return (
    <div className="space-y-10 text-gray-800 font-[Calibri,sans-serif]">
      {isEditing && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Edit mode active — click any field to edit, hover a section to delete it.
        </div>
      )}

      {/* Cover */}
      <div className="text-center py-8 border-b-2 border-brand-orange">
        <p className="text-brand-orange font-bold text-lg">{info.preparedBy || company.name}</p>
        <h1 className="text-5xl font-black mt-6 mb-2 tracking-tight">
          <EText value={data.project.name} isEditing={isEditing} onSave={v => patch(d => { d.project.name = v })} />
        </h1>
        <p className="text-brand-orange text-2xl font-semibold">
          <EText value={data.project.subtitle} isEditing={isEditing} onSave={v => patch(d => { d.project.subtitle = v })} />
        </p>
        <p className="text-gray-500 mt-1">Technical Proposal & Engagement Plan</p>
        <div className="mt-6 inline-block text-left border border-gray-200 rounded-lg overflow-hidden">
          {[
            ['Prepared by', info.preparedBy || company.name],
            ['Prepared for', data.project.client],
            ['Date', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
            ['Version', `${data.project.version} — CONFIDENTIAL`],
            ['Engagement', data.project.engagementType],
          ].map(([k, v]) => (
            <div key={k} className="flex border-b border-gray-100 last:border-b-0">
              <span className="bg-gray-50 font-semibold text-xs px-4 py-2 w-36 shrink-0">{k}</span>
              <span className="text-xs px-4 py-2">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Summary */}
      {sec('executiveSummary', <div>
        <SectionTitle num="01" title="Executive Summary" />
        <EArea value={es.text} isEditing={isEditing} onSave={v => patch(d => { d.executiveSummary.text = v })} className="mb-4" />
        <div className={`grid gap-3 mb-4 ${ce.summary.totalHoursSaved > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {[
            { icon: <DollarSign className="h-5 w-5" />, label: 'Total Cost', value: `~${formatCurrency(es.totalCost)}` },
            { icon: <Clock className="h-5 w-5" />, label: 'Timeline', value: `~${es.totalTimeline}` },
            ...(ce.summary.totalHoursSaved > 0 ? [{ icon: <TrendingDown className="h-5 w-5" />, label: 'AI Savings', value: formatCurrency(ce.summary.aiSavingsAmount) }] : []),
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-lg border border-brand-200 bg-brand-50 p-4 flex items-center gap-3">
              <div className="text-brand-orange">{icon}</div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-bold text-brand-orange text-lg">{value}</p>
              </div>
            </div>
          ))}
        </div>
        {es.phaseBreakdown?.length > 0 && (
          <OrangeTable
            headers={es.phaseBreakdown.map(p => p.name)}
            rows={[
              es.phaseBreakdown.map(p => <span className="font-bold text-brand-orange">{formatCurrency(p.cost)}</span>),
              es.phaseBreakdown.map(p => p.duration),
              es.phaseBreakdown.map((p, i) => (
                <EText key={i} value={p.description} isEditing={isEditing} onSave={v => patch(d => { d.executiveSummary.phaseBreakdown[i].description = v })} />
              )),
            ]}
          />
        )}
      </div>)}

      {/* Project Understanding */}
      {sec('projectUnderstanding', <div>
        <SectionTitle num="02" title="Project Understanding" />
        <SubTitle text={`2.1 What ${data.project.name} Is`} />
        <EArea value={data.projectUnderstanding.whatItIs} isEditing={isEditing} onSave={v => patch(d => { d.projectUnderstanding.whatItIs = v })} />
        <SubTitle text="2.2 Problem Being Solved" />
        <EArea value={data.projectUnderstanding.problemSolving} isEditing={isEditing} onSave={v => patch(d => { d.projectUnderstanding.problemSolving = v })} />
        <SubTitle text="2.3 Key Features" />
        <EList items={data.projectUnderstanding.keyFeatures} isEditing={isEditing} onSave={v => patch(d => { d.projectUnderstanding.keyFeatures = v })} />
        {data.projectUnderstanding.userTypes?.length > 0 && (
          <>
            <SubTitle text="2.4 User Types" />
            <OrangeTable
              headers={['User Type', 'Description']}
              rows={data.projectUnderstanding.userTypes.map((u, i) => [
                <EText value={u.type} isEditing={isEditing} onSave={v => patch(d => { d.projectUnderstanding.userTypes[i].type = v })} className="font-semibold" />,
                <EText value={u.description} isEditing={isEditing} onSave={v => patch(d => { d.projectUnderstanding.userTypes[i].description = v })} />,
              ])}
            />
          </>
        )}
      </div>)}

      {/* Objectives */}
      {sec('objectives', <div>
        <SectionTitle num="03" title="Objectives & Success Criteria" />
        <SubTitle text="3.1 Delivery Objectives" />
        <EList items={data.objectives.delivery} isEditing={isEditing} onSave={v => patch(d => { d.objectives.delivery = v })} />
        <SubTitle text="3.2 Success Criteria" />
        <OrangeTable
          headers={['Metric', 'Target', 'Validation Method']}
          rows={data.objectives.successCriteria.map((sc, i) => [
            <EText value={sc.metric} isEditing={isEditing} onSave={v => patch(d => { d.objectives.successCriteria[i].metric = v })} className="font-semibold" />,
            <EText value={sc.target} isEditing={isEditing} onSave={v => patch(d => { d.objectives.successCriteria[i].target = v })} className="text-brand-orange font-semibold" />,
            <EText value={sc.validationMethod} isEditing={isEditing} onSave={v => patch(d => { d.objectives.successCriteria[i].validationMethod = v })} />,
          ])}
        />
      </div>)}

      {/* Proposed Solution */}
      {sec('proposedSolution', <div>
        <SectionTitle num="04" title="Proposed Solution Overview" />
        <EArea value={data.proposedSolution.overview} isEditing={isEditing} onSave={v => patch(d => { d.proposedSolution.overview = v })} className="mb-4" />
        <SubTitle text="4.1 Architecture Pillars" />
        <OrangeTable
          headers={['Pillar', 'Technology', 'Description']}
          rows={data.proposedSolution.architecturePillars.map((p, i) => [
            <EText value={p.name} isEditing={isEditing} onSave={v => patch(d => { d.proposedSolution.architecturePillars[i].name = v })} className="font-semibold" />,
            <EText value={p.technology} isEditing={isEditing} onSave={v => patch(d => { d.proposedSolution.architecturePillars[i].technology = v })} className="text-brand-orange" />,
            <EText value={p.description} isEditing={isEditing} onSave={v => patch(d => { d.proposedSolution.architecturePillars[i].description = v })} />,
          ])}
        />
      </div>)}

      {/* Tech Stack */}
      {sec('techStack', <div>
        <SectionTitle num="05" title="Technical Architecture" />
        <SubTitle text="5.1 Technology Stack" />
        <OrangeTable
          headers={['Layer', 'Technology', 'Justification']}
          rows={data.techStack.map((t, i) => [
            <EText value={t.layer} isEditing={isEditing} onSave={v => patch(d => { d.techStack[i].layer = v })} className="font-semibold" />,
            <EText value={t.technology} isEditing={isEditing} onSave={v => patch(d => { d.techStack[i].technology = v })} className="text-brand-orange" />,
            <EText value={t.justification} isEditing={isEditing} onSave={v => patch(d => { d.techStack[i].justification = v })} />,
          ])}
        />
      </div>)}

      {/* Cost */}
      {sec('cost', <div>
        <SectionTitle num="06" title="Development Approach & Cost Estimation" />
        <EArea value={data.methodology.approach} isEditing={isEditing} onSave={v => patch(d => { d.methodology.approach = v })} />

        {ce.summary.totalHoursSaved > 0 && (
          <div className="rounded-md bg-brand-50 border border-brand-200 px-4 py-3 text-sm mb-4">
            <span className="font-bold text-brand-orange">AI-Assisted Development: </span>
            <span className="text-gray-700">Base hours = traditional estimate. AI-Reduced hours = actual engagement with AI tools. Cost calculated on AI-reduced hours.</span>
          </div>
        )}

        <SubTitle text="6.2 Module Cost Breakdown" />
        {ce.summary.totalHoursSaved > 0 ? (
          <OrangeTable
            headers={['Module', 'Features', 'Base Hrs', 'AI Hrs', 'Saved', 'Cost']}
            rows={[
              ...ce.modules.map((m, i) => [
                <span className="font-semibold">
                  <EText value={m.phase} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].phase = v })} />
                  {': '}
                  <EText value={m.name} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].name = v })} />
                </span>,
                <span className="text-xs">{m.features.slice(0, 3).join(', ')}{m.features.length > 3 ? '…' : ''}</span>,
                <ENum value={m.baseHours} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].baseHours = v })} suffix="h" />,
                <span className="font-bold text-brand-orange">
                  <ENum value={m.aiReducedHours} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].aiReducedHours = v })} suffix="h" />
                </span>,
                <span className="text-green-600">↓<ENum value={m.hoursSaved} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].hoursSaved = v })} suffix="h" /></span>,
                <span className="font-bold">
                  $<ENum value={m.cost} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].cost = v })} />
                </span>,
              ]),
              [
                <span className="font-black text-brand-orange">TOTAL</span>,
                '',
                <span className="font-bold">{ce.summary.totalBaseHours}h</span>,
                <span className="font-black text-brand-orange">{ce.summary.totalAIReducedHours}h</span>,
                <span className="font-bold text-green-600">↓{ce.summary.totalHoursSaved}h</span>,
                <span className="font-black text-brand-orange text-base">{formatCurrency(ce.summary.totalCost)}</span>,
              ],
            ]}
          />
        ) : (
          <OrangeTable
            headers={['Module', 'Features', 'Hours', 'Cost']}
            rows={[
              ...ce.modules.map((m, i) => [
                <span className="font-semibold">
                  <EText value={m.phase} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].phase = v })} />
                  {': '}
                  <EText value={m.name} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].name = v })} />
                </span>,
                <span className="text-xs">{m.features.slice(0, 3).join(', ')}{m.features.length > 3 ? '…' : ''}</span>,
                <ENum value={m.aiReducedHours} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].aiReducedHours = v })} suffix="h" />,
                <span className="font-bold">
                  $<ENum value={m.cost} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.modules[i].cost = v })} />
                </span>,
              ]),
              [
                <span className="font-black text-brand-orange">TOTAL</span>,
                '',
                <span className="font-black text-brand-orange">{ce.summary.totalAIReducedHours}h</span>,
                <span className="font-black text-brand-orange text-base">{formatCurrency(ce.summary.totalCost)}</span>,
              ],
            ]}
          />
        )}

        <SubTitle text="6.3 Resources & Costing" />
        <OrangeTable
          headers={['Resource', 'Rate', 'Hours', 'Total Cost', 'Responsibility']}
          rows={ce.rolesRequired.map((r, i) => [
            <span className="font-semibold">{r.role}</span>,
            <span className="text-brand-orange font-bold">
              $<ENum value={r.rate} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.rolesRequired[i].rate = v })} />/hr
            </span>,
            <ENum value={r.totalHours} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.rolesRequired[i].totalHours = v })} suffix="h" />,
            <span className="font-bold">{formatCurrency(r.totalCost)}</span>,
            <EText value={r.responsibility} isEditing={isEditing} onSave={v => patch(d => { d.costEstimation.rolesRequired[i].responsibility = v })} className="text-xs" />,
          ])}
        />
        <p className="text-xs text-gray-500 mt-2">Note: Infrastructure costs are variable. All third-party costs borne by the client.</p>

        <SubTitle text="6.4 Payment Structure" />
        <EArea value={data.methodology.paymentStructure} isEditing={isEditing} onSave={v => patch(d => { d.methodology.paymentStructure = v })} />
      </div>)}

      {/* Risks */}
      {sec('risks', <div>
        <SectionTitle num="07" title="Risks & Mitigation" />
        <OrangeTable
          headers={['Risk', 'Likelihood', 'Impact', 'Mitigation']}
          rows={data.risks.map((r, i) => [
            <EText value={r.risk} isEditing={isEditing} onSave={v => patch(d => { d.risks[i].risk = v })} />,
            <RiskBadge level={r.likelihood} isEditing={isEditing} onSave={v => patch(d => { d.risks[i].likelihood = v as Risk['likelihood'] })} />,
            <RiskBadge level={r.impact} isEditing={isEditing} onSave={v => patch(d => { d.risks[i].impact = v as Risk['impact'] })} />,
            <EText value={r.mitigation} isEditing={isEditing} onSave={v => patch(d => { d.risks[i].mitigation = v })} />,
          ])}
        />
      </div>)}

      {/* Governance */}
      {sec('governance', <div>
        <SectionTitle num="08" title="Communication & Governance" />
        <SubTitle text="Reporting Cadence" />
        <EList items={data.governance.reportingCadence} isEditing={isEditing} onSave={v => patch(d => { d.governance.reportingCadence = v })} />
        <SubTitle text="Change Request Process" />
        <EList items={data.governance.changeRequestProcess} isEditing={isEditing} onSave={v => patch(d => { d.governance.changeRequestProcess = v })} />
        <SubTitle text="Phase Sign-Off" />
        <EArea value={data.governance.phaseSignOff} isEditing={isEditing} onSave={v => patch(d => { d.governance.phaseSignOff = v })} />
      </div>)}

      {/* Assumptions */}
      {(data.assumptions?.length > 0 || data.openQuestions?.length > 0 || hidden.has('assumptions')) &&
        sec('assumptions', <div>
          <SectionTitle num="09" title="Assumptions & Open Questions" />
          {data.assumptions?.length > 0 && (
            <>
              <SubTitle text="Assumptions" />
              <EList items={data.assumptions} isEditing={isEditing} onSave={v => patch(d => { d.assumptions = v })} />
            </>
          )}
          {data.openQuestions?.length > 0 && (
            <>
              <SubTitle text="Open Questions" />
              <EList items={data.openQuestions} isEditing={isEditing} onSave={v => patch(d => { d.openQuestions = v })} />
            </>
          )}
        </div>)
      }

      {/* Footer */}
      <div className="text-center pt-8 border-t-2 border-brand-orange">
        <p className="font-bold text-gray-800">Thank you for the opportunity to propose on {data.project.name}.</p>
        <p className="text-brand-orange italic mt-1">{company.tagline}</p>
        <p className="text-xs text-gray-400 mt-3">{company.name} · {company.website} · {company.phone}</p>
      </div>
    </div>
  )
}
