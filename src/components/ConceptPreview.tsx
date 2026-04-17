import type { ConceptData, ConceptJourneyStep } from '@/types/concept'
import type { ProjectInfo, CompanyConfig } from '@/types/proposal'

interface Props {
  data: ConceptData
  info: ProjectInfo
  company: CompanyConfig
  isEditing?: boolean
  onUpdate?: (updated: ConceptData) => void
}

// ── Inline edit primitives ────────────────────────────────────────────────────

function EText({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full rounded border border-brand-200 bg-brand-50 px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-orange ${className}`}
    />
  )
}

function EArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded border border-brand-200 bg-brand-50 px-2 py-1.5 text-sm text-gray-800 resize-y focus:outline-none focus:ring-1 focus:ring-brand-orange"
    />
  )
}

function ENum({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full rounded border border-brand-200 bg-brand-50 px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-orange"
    />
  )
}

function EList({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1">
          <textarea
            value={item}
            rows={2}
            onChange={e => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            className="flex-1 rounded border border-brand-200 bg-brand-50 px-2 py-1 text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="mt-1 text-red-400 hover:text-red-600 text-xs px-1"
          >✕</button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ''])}
        className="text-xs text-brand-orange hover:underline"
      >+ Add item</button>
    </div>
  )
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === 'Must Have'
      ? 'bg-red-100 text-red-700 border-red-200'
      : priority === 'Should Have'
        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
        : 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {priority}
    </span>
  )
}

function PlatformTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    mobile: 'bg-blue-100 text-blue-700',
    web: 'bg-indigo-100 text-indigo-700',
    backend: 'bg-gray-100 text-gray-700',
    desktop: 'bg-purple-100 text-purple-700',
    other: 'bg-teal-100 text-teal-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[type] ?? map.other}`}>
      {type}
    </span>
  )
}

function CompetitorTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    direct: 'bg-red-100 text-red-700',
    indirect: 'bg-amber-100 text-amber-700',
    partial: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  )
}

function MetricCategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    'User Acquisition': 'bg-green-100 text-green-700',
    'Retention': 'bg-blue-100 text-blue-700',
    'Engagement': 'bg-purple-100 text-purple-700',
    'Revenue': 'bg-amber-100 text-amber-700',
    'Operational': 'bg-gray-100 text-gray-700',
  }
  const cls = map[category] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {category}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-4 pb-2 border-b border-brand-100">
      {children}
    </h2>
  )
}

function currency(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

// Helper: detect if steps are rich objects or legacy strings
function isRichStep(step: unknown): step is ConceptJourneyStep {
  return typeof step === 'object' && step !== null && 'action' in step
}

// ── Emotion colour map ────────────────────────────────────────────────────────

function emotionColor(emotion: string): string {
  const e = emotion.toLowerCase()
  if (e.includes('excit') || e.includes('happy') || e.includes('delight')) return 'bg-green-100 text-green-700 border-green-200'
  if (e.includes('satisf') || e.includes('confident') || e.includes('relief')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (e.includes('curious') || e.includes('interest')) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (e.includes('frustrat') || e.includes('annoyed') || e.includes('confused')) return 'bg-red-100 text-red-700 border-red-200'
  if (e.includes('cautious') || e.includes('uncertain') || e.includes('hesit')) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConceptPreview({ data, info, company, isEditing = false, onUpdate }: Props) {
  function update(patch: Partial<ConceptData>) {
    onUpdate?.({ ...data, ...patch })
  }

  return (
    <div className="space-y-10 text-sm text-gray-800 font-sans">

      {/* ── Cover ── */}
      <div className="rounded-xl p-8 text-white" style={{ background: company.brandColor }}>
        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Concept Document</p>
        <h1 className="text-3xl font-bold leading-tight mb-1">{data.projectName}</h1>
        <p className="opacity-80 text-sm">
          {data.client && `For: ${data.client} · `}Prepared by {company.name}
        </p>
        <div className="mt-6 bg-white/10 rounded-lg px-4 py-3">
          {isEditing
            ? <EArea value={data.overview} onChange={v => update({ overview: v })} rows={4} />
            : <p className="text-sm leading-relaxed opacity-90">{data.overview}</p>}
        </div>
      </div>

      {/* ── Problem Statement ── */}
      <section>
        <SectionTitle>Problem Statement</SectionTitle>
        {isEditing
          ? <EArea value={data.problemStatement} onChange={v => update({ problemStatement: v })} rows={3} />
          : <p className="text-gray-700 leading-relaxed">{data.problemStatement}</p>}
      </section>

      {/* ── Target Platforms ── */}
      <section>
        <SectionTitle>Target Platforms</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.targetPlatforms.map((p, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{p.platform}</span>
                <PlatformTypeBadge type={p.type} />
              </div>
              {isEditing
                ? <EArea value={p.rationale} onChange={v => {
                    const next = [...data.targetPlatforms]
                    next[i] = { ...next[i], rationale: v }
                    update({ targetPlatforms: next })
                  }} rows={2} />
                : <p className="text-xs text-gray-600">{p.rationale}</p>}
              <div className="flex flex-wrap gap-1">
                {p.targetUsers.map((u, j) => (
                  <span key={j} className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{u}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Benefits (NEW) ── */}
      {data.platformBenefits?.length > 0 && (
        <section>
          <SectionTitle>Platform Benefits &amp; Value Delivered</SectionTitle>
          <div className="space-y-4">
            {data.platformBenefits.map((pb, i) => (
              <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-brand-50 border-b border-brand-100 px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-brand-700">{pb.platform}</span>
                    <span className="mx-2 text-brand-200">·</span>
                    <span className="text-xs text-gray-500">{pb.primaryBeneficiary}</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs font-medium text-gray-800 italic">"{pb.valueProposition}"</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Key Benefits</p>
                      <ul className="space-y-1">
                        {pb.keyBenefits.map((b, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-brand-orange" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Success KPIs</p>
                      <ul className="space-y-1">
                        {pb.kpis.map((k, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="flex-shrink-0 mt-0.5 text-green-600">✓</span>
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── User Personas (NEW) ── */}
      {data.personas?.length > 0 && (
        <section>
          <SectionTitle>User Personas</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.personas.map((persona, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {persona.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{persona.name}</p>
                    <p className="text-xs text-gray-500">{persona.role} · {persona.demographics}</p>
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="border-l-2 border-brand-orange pl-3 italic text-xs text-gray-600 leading-relaxed">
                  "{persona.quote}"
                </blockquote>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Goals</p>
                    <ul className="space-y-0.5">
                      {persona.goals.map((g, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-gray-700">
                          <span className="flex-shrink-0 mt-1 text-green-500">→</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pain Points</p>
                    <ul className="space-y-0.5">
                      {persona.painPoints.map((p, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-gray-700">
                          <span className="flex-shrink-0 mt-1 text-red-400">×</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {persona.preferredChannels?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {persona.preferredChannels.map((ch, j) => (
                      <span key={j} className="inline-block rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-600">{ch}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── User Types ── */}
      <section>
        <SectionTitle>User Types</SectionTitle>
        <div className="space-y-4">
          {data.userTypes.map((u, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                  {u.type.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{u.type}</p>
                  <p className="text-xs text-gray-500">Primary: {u.primaryPlatform}</p>
                </div>
              </div>
              {isEditing
                ? <EArea value={u.description} onChange={v => {
                    const next = [...data.userTypes]
                    next[i] = { ...next[i], description: v }
                    update({ userTypes: next })
                  }} rows={2} />
                : <p className="text-xs text-gray-600 mb-2">{u.description}</p>}
              <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 mt-2 columns-2">
                {u.keyActions.map((a, j) => <li key={j}>{a}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── User Journeys (ENHANCED) ── */}
      {data.userJourneys.length > 0 && (
        <section>
          <SectionTitle>End-to-End User Journeys</SectionTitle>
          <div className="space-y-8">
            {data.userJourneys.map((journey, i) => (
              <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Journey header */}
                <div className="bg-brand-orange px-5 py-3">
                  <p className="font-bold text-white">{journey.userType} — {journey.journey}</p>
                  {journey.trigger && (
                    <p className="text-xs text-white/80 mt-0.5">Trigger: {journey.trigger}</p>
                  )}
                </div>

                {/* Steps */}
                <div className="divide-y divide-gray-100">
                  {journey.steps.map((step, j) => {
                    if (isRichStep(step)) {
                      return (
                        <div key={j} className="flex gap-0 group">
                          {/* Step number */}
                          <div className="flex flex-col items-center px-4 py-3 bg-gray-50 border-r border-gray-100 min-w-[52px]">
                            <div className="h-6 w-6 rounded-full bg-brand-orange text-white text-xs flex items-center justify-center font-bold">{j + 1}</div>
                          </div>
                          {/* Step content */}
                          <div className="flex-1 px-4 py-3 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-800 text-xs">{step.action}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-indigo-700">
                                📍 {step.touchpoint}
                              </span>
                              {step.emotion && (
                                <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${emotionColor(step.emotion)}`}>
                                  {step.emotion}
                                </span>
                              )}
                            </div>
                            {step.systemResponse && (
                              <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">{step.systemResponse}</p>
                            )}
                          </div>
                        </div>
                      )
                    }
                    // Legacy string step
                    return (
                      <div key={j} className="flex gap-0">
                        <div className="flex flex-col items-center px-4 py-3 bg-gray-50 border-r border-gray-100 min-w-[52px]">
                          <div className="h-6 w-6 rounded-full bg-brand-orange text-white text-xs flex items-center justify-center font-bold">{j + 1}</div>
                        </div>
                        <div className="flex-1 px-4 py-3">
                          {isEditing ? (
                            <EArea value={step as string} onChange={v => {
                              const next = [...journey.steps] as string[]
                              next[j] = v
                              const journeys = [...data.userJourneys]
                              journeys[i] = { ...journeys[i], steps: next }
                              update({ userJourneys: journeys })
                            }} rows={2} />
                          ) : (
                            <span className="text-xs text-gray-700 leading-relaxed">{step as string}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Outcome + success indicator */}
                {(journey.outcome || journey.successIndicator) && (
                  <div className="bg-green-50 border-t border-green-200 px-5 py-3 flex gap-6">
                    {journey.outcome && (
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-0.5">Desired Outcome</p>
                        <p className="text-xs text-green-600">{journey.outcome}</p>
                      </div>
                    )}
                    {journey.successIndicator && (
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-0.5">Success Indicator</p>
                        <p className="text-xs text-green-600">{journey.successIndicator}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Monetization (NEW) ── */}
      {data.monetization && (
        <section>
          <SectionTitle>Monetisation Strategy</SectionTitle>
          <div className="space-y-4">
            {/* Overview KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-brand-50 border border-brand-200 p-4">
                <p className="text-xs font-semibold text-brand-700 mb-1">Business Model</p>
                <p className="text-xs text-gray-700 leading-relaxed">{data.monetization.businessModel}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">Primary Revenue Driver</p>
                <p className="text-sm font-bold text-gray-800">{data.monetization.primaryRevenue}</p>
                <p className="text-xs text-gray-500 mt-1">{data.monetization.pricingStrategy}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">Estimated ARPU</p>
                <p className="text-sm font-bold text-brand-orange">{data.monetization.estimatedArpu}</p>
                <p className="text-xs text-gray-500 mt-1">{data.monetization.breakEvenNote}</p>
              </div>
            </div>

            {/* Revenue streams */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-brand-orange text-white">
                    <th className="px-4 py-2.5 text-left font-semibold">Revenue Stream</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Model</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Target User</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Revenue Range</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Phase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.monetization.streams.map((stream, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{stream.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{stream.description}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{stream.model}</td>
                      <td className="px-4 py-3 text-gray-600">{stream.targetUser}</td>
                      <td className="px-4 py-3 font-semibold text-brand-orange">{stream.revenueRange}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{stream.implementationPhase}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Competitive Landscape (NEW) ── */}
      {data.competitiveLandscape?.length > 0 && (
        <section>
          <SectionTitle>Competitive Landscape</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-4 py-2.5 text-left font-semibold w-32">Competitor</th>
                  <th className="px-4 py-2.5 text-left font-semibold w-20">Type</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Strengths</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Weaknesses</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Our Edge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.competitiveLandscape.map((comp, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{comp.name}</td>
                    <td className="px-4 py-3"><CompetitorTypeBadge type={comp.type} /></td>
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5">
                        {comp.strengths.map((s, j) => (
                          <li key={j} className="flex items-start gap-1 text-gray-600">
                            <span className="text-green-500 shrink-0">+</span>{s}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5">
                        {comp.weaknesses.map((w, j) => (
                          <li key={j} className="flex items-start gap-1 text-gray-600">
                            <span className="text-red-400 shrink-0">−</span>{w}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-brand-50 border border-brand-200 px-2 py-1 text-brand-700 font-medium leading-snug">{comp.ourEdge}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Architecture Overview ── */}
      <section>
        <SectionTitle>Architecture Overview</SectionTitle>
        {isEditing
          ? <EArea value={data.architectureOverview.description} onChange={v => update({ architectureOverview: { ...data.architectureOverview, description: v } })} rows={3} />
          : <p className="text-gray-700 leading-relaxed mb-4">{data.architectureOverview.description}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 mt-4">
          {data.architectureOverview.components.map((comp, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">{comp.name}</span>
                <span className="text-xs text-brand-orange font-medium">{comp.technology}</span>
              </div>
              <p className="text-xs text-gray-600">{comp.purpose}</p>
              {comp.communicatesWith.length > 0 && (
                <p className="text-xs text-gray-400">Connects to: {comp.communicatesWith.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
        {data.architectureOverview.dataFlow && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Data Flow</p>
            {isEditing
              ? <EArea value={data.architectureOverview.dataFlow} onChange={v => update({ architectureOverview: { ...data.architectureOverview, dataFlow: v } })} rows={2} />
              : <p className="text-xs text-gray-600 leading-relaxed">{data.architectureOverview.dataFlow}</p>}
          </div>
        )}
      </section>

      {/* ── Tech Stack ── */}
      <section>
        <SectionTitle>Recommended Tech Stack</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-brand-orange text-white">
                <th className="px-4 py-2.5 text-left font-semibold">Layer</th>
                <th className="px-4 py-2.5 text-left font-semibold">Recommended</th>
                <th className="px-4 py-2.5 text-left font-semibold">Alternatives</th>
                <th className="px-4 py-2.5 text-left font-semibold">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.techStack.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.layer}</td>
                  <td className="px-4 py-2.5 text-brand-700 font-semibold">
                    {isEditing
                      ? <EText value={row.recommended} onChange={v => {
                          const next = [...data.techStack]
                          next[i] = { ...next[i], recommended: v }
                          update({ techStack: next })
                        }} />
                      : row.recommended}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{row.alternatives.join(', ') || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {isEditing
                      ? <EText value={row.rationale} onChange={v => {
                          const next = [...data.techStack]
                          next[i] = { ...next[i], rationale: v }
                          update({ techStack: next })
                        }} />
                      : row.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Key Features ── */}
      <section>
        <SectionTitle>Key Features</SectionTitle>
        <div className="space-y-5">
          {(['Must Have', 'Should Have', 'Nice to Have'] as const).map(priority => {
            const features = data.keyFeatures.filter(f => f.priority === priority)
            if (features.length === 0) return null
            return (
              <div key={priority}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{priority} ({features.length})</p>
                <div className="space-y-1.5">
                  {features.map((feat, fi) => {
                    const globalIdx = data.keyFeatures.indexOf(feat)
                    return (
                      <div key={fi} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <PriorityBadge priority={feat.priority} />
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-1">
                              <EText value={feat.name} onChange={v => {
                                const next = [...data.keyFeatures]
                                next[globalIdx] = { ...next[globalIdx], name: v }
                                update({ keyFeatures: next })
                              }} />
                              <EArea value={feat.description} onChange={v => {
                                const next = [...data.keyFeatures]
                                next[globalIdx] = { ...next[globalIdx], description: v }
                                update({ keyFeatures: next })
                              }} rows={2} />
                            </div>
                          ) : (
                            <>
                              <span className="font-medium text-gray-800">{feat.name}</span>
                              {feat.description && <p className="text-xs text-gray-500 mt-0.5">{feat.description}</p>}
                            </>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {feat.platforms.map((p, j) => (
                              <span key={j} className="inline-block rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">{p}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Success Metrics (NEW) ── */}
      {data.successMetrics?.length > 0 && (
        <section>
          <SectionTitle>Success Metrics &amp; KPIs</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-4 py-2.5 text-left font-semibold">Category</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Metric</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Target</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Timeframe</th>
                  <th className="px-4 py-2.5 text-left font-semibold">How to Measure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.successMetrics.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2.5"><MetricCategoryBadge category={m.category} /></td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{m.metric}</td>
                    <td className="px-4 py-2.5 font-semibold text-brand-orange">{m.target}</td>
                    <td className="px-4 py-2.5 text-gray-500">{m.timeframe}</td>
                    <td className="px-4 py-2.5 text-gray-500">{m.measurementMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Ballpark Estimate ── */}
      <section>
        <SectionTitle>Ballpark Estimate</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl border-2 border-brand-orange bg-brand-50 p-4 text-center">
            <p className="text-xs text-brand-700 font-medium mb-2">Estimated Cost Range</p>
            {isEditing ? (
              <div className="space-y-1">
                <ENum value={data.ballparkEstimate.minCost} onChange={v => update({ ballparkEstimate: { ...data.ballparkEstimate, minCost: v } })} />
                <p className="text-xs text-gray-400">to</p>
                <ENum value={data.ballparkEstimate.maxCost} onChange={v => update({ ballparkEstimate: { ...data.ballparkEstimate, maxCost: v } })} />
              </div>
            ) : (
              <p className="text-2xl font-bold text-brand-orange">
                {currency(data.ballparkEstimate.minCost)} – {currency(data.ballparkEstimate.maxCost)}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">{data.ballparkEstimate.currency}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-xs text-gray-500 font-medium mb-2">Timeline Range</p>
            {isEditing ? (
              <div className="space-y-1">
                <EText value={data.ballparkEstimate.timeline.min} onChange={v => update({ ballparkEstimate: { ...data.ballparkEstimate, timeline: { ...data.ballparkEstimate.timeline, min: v } } })} />
                <p className="text-xs text-gray-400">to</p>
                <EText value={data.ballparkEstimate.timeline.max} onChange={v => update({ ballparkEstimate: { ...data.ballparkEstimate, timeline: { ...data.ballparkEstimate.timeline, max: v } } })} />
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-800">
                {data.ballparkEstimate.timeline.min} – {data.ballparkEstimate.timeline.max}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 font-medium mb-2">Basis</p>
            {isEditing
              ? <EArea value={data.ballparkEstimate.basis} onChange={v => update({ ballparkEstimate: { ...data.ballparkEstimate, basis: v } })} rows={3} />
              : <p className="text-xs text-gray-600 leading-relaxed">{data.ballparkEstimate.basis}</p>}
          </div>
        </div>
        <div className="space-y-3">
          {data.ballparkEstimate.phases.map((phase, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-orange text-white flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-800">{phase.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {isEditing ? (
                      <>
                        <EText value={phase.duration} onChange={v => {
                          const next = [...data.ballparkEstimate.phases]
                          next[i] = { ...next[i], duration: v }
                          update({ ballparkEstimate: { ...data.ballparkEstimate, phases: next } })
                        }} className="w-28" />
                        <EText value={phase.costRange} onChange={v => {
                          const next = [...data.ballparkEstimate.phases]
                          next[i] = { ...next[i], costRange: v }
                          update({ ballparkEstimate: { ...data.ballparkEstimate, phases: next } })
                        }} className="w-36" />
                      </>
                    ) : (
                      <>
                        <span>{phase.duration}</span>
                        <span className="font-semibold text-brand-orange">{phase.costRange}</span>
                      </>
                    )}
                  </div>
                </div>
                {isEditing
                  ? <EArea value={phase.scope} onChange={v => {
                      const next = [...data.ballparkEstimate.phases]
                      next[i] = { ...next[i], scope: v }
                      update({ ballparkEstimate: { ...data.ballparkEstimate, phases: next } })
                    }} rows={2} />
                  : <p className="text-xs text-gray-600">{phase.scope}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Go-to-Market (NEW) ── */}
      {data.goToMarket && (
        <section>
          <SectionTitle>Go-to-Market Strategy</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Launch Strategy</p>
                <p className="text-xs text-gray-700 leading-relaxed">{data.goToMarket.launchStrategy}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Early Adopter Profile</p>
                <p className="text-xs text-gray-700 leading-relaxed">{data.goToMarket.earlyAdopterProfile}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Target Channels</p>
              <div className="flex flex-wrap gap-1.5">
                {data.goToMarket.targetChannels.map((ch, i) => (
                  <span key={i} className="inline-flex rounded-full bg-brand-50 border border-brand-200 px-2.5 py-1 text-xs text-brand-700">{ch}</span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {data.goToMarket.phases.map((phase, i) => (
                <div key={i} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-gray-800 text-sm">{phase.phase}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{phase.duration}</span>
                      </div>
                    </div>
                    <p className="text-xs text-brand-orange font-medium mb-1.5">Goal: {phase.goal}</p>
                    <ul className="space-y-0.5">
                      {phase.activities.map((act, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <span className="shrink-0 mt-0.5">→</span>{act}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {data.goToMarket.partnershipOpportunities?.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">Partnership Opportunities</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.goToMarket.partnershipOpportunities.map((p, i) => (
                    <span key={i} className="inline-flex rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-xs text-amber-800">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Technical Insights ── */}
      {data.technicalInsights.length > 0 && (
        <section>
          <SectionTitle>Technical Insights</SectionTitle>
          {isEditing
            ? <EList items={data.technicalInsights} onChange={v => update({ technicalInsights: v })} />
            : (
              <ul className="space-y-2">
                {data.technicalInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-brand-orange" />
                    {insight}
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      {/* ── Risks & Open Questions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.risks.length > 0 && (
          <section>
            <SectionTitle>Risks to Consider</SectionTitle>
            {isEditing
              ? <EList items={data.risks} onChange={v => update({ risks: v })} />
              : (
                <ul className="space-y-2">
                  {data.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="flex-shrink-0 mt-0.5 h-3.5 w-3.5 rounded-full bg-red-100 border border-red-300 text-red-600 flex items-center justify-center text-[8px] font-bold">!</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              )}
          </section>
        )}
        {data.openQuestions.length > 0 && (
          <section>
            <SectionTitle>Open Questions</SectionTitle>
            {isEditing
              ? <EList items={data.openQuestions} onChange={v => update({ openQuestions: v })} />
              : (
                <ul className="space-y-2">
                  {data.openQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="flex-shrink-0 mt-0.5 h-3.5 w-3.5 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-700 flex items-center justify-center text-[8px] font-bold">?</span>
                      {q}
                    </li>
                  ))}
                </ul>
              )}
          </section>
        )}
      </div>

      {/* ── Next Steps ── */}
      {data.nextSteps.length > 0 && (
        <section>
          <SectionTitle>Recommended Next Steps</SectionTitle>
          {isEditing
            ? <EList items={data.nextSteps} onChange={v => update({ nextSteps: v })} />
            : (
              <ol className="space-y-2">
                {data.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-brand-orange text-white text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-700 leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            )}
        </section>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
        Concept document prepared by {company.name} · {company.website} · {company.email}
      </div>
    </div>
  )
}
