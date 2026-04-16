import { Slider } from '@/components/ui/slider'
import type { AIConfig } from '@/types/proposal'
import { Info, Lightbulb } from 'lucide-react'

interface AIConfigPanelProps {
  config: AIConfig
  onChange: (config: AIConfig) => void
}

const CATEGORIES: {
  key: keyof AIConfig
  label: string
  description: string
  recommended: number
}[] = [
  { key: 'Setup & Architecture', label: 'Setup & Architecture', description: 'Boilerplate, project setup, architecture decisions', recommended: 35 },
  { key: 'Frontend Development', label: 'Frontend Development', description: 'UI components, screens, interactions', recommended: 45 },
  { key: 'Backend Development', label: 'Backend Development', description: 'APIs, business logic, data models', recommended: 35 },
  { key: 'API Integration', label: 'API Integration', description: 'Third-party services, webhooks, SDKs', recommended: 30 },
  { key: 'UI/UX Design', label: 'UI/UX Design', description: 'Wireframes, design system, prototypes', recommended: 25 },
  { key: 'QA & Testing', label: 'QA & Testing', description: 'Test cases, regression, QA reports', recommended: 20 },
  { key: 'DevOps & Infra', label: 'DevOps & Infra', description: 'CI/CD, deployments, infrastructure', recommended: 20 },
  { key: 'Documentation', label: 'Documentation', description: 'Technical docs, API docs, changelogs', recommended: 55 },
]

export function AIConfigPanel({ config, onChange }: AIConfigPanelProps) {
  function applyRecommendations() {
    const next = { ...config }
    for (const c of CATEGORIES) next[c.key] = c.recommended
    onChange(next)
  }

  const avg = Math.round(Object.values(config).reduce((a, b) => a + b, 0) / Object.values(config).length)

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-brand-50 border border-brand-200 px-3 py-2 flex gap-2 text-xs text-brand-700">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Set the <strong>actual % effort reduction</strong> your team will get from AI tools per category.
          The proposal shows <strong>base hours</strong> (without AI) alongside <strong>AI-reduced hours</strong> (what you'll bill), with cost on the reduced hours.
          {avg > 0 && <> · <strong>Current avg: {avg}%</strong></>}
        </span>
      </div>

      <button
        onClick={applyRecommendations}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-brand-orange border border-brand-orange/40 rounded-md py-1.5 hover:bg-brand-50 transition-colors"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Load typical AI reduction values as a starting point
      </button>

      <div className="space-y-5">
        {CATEGORIES.map(({ key, label, description, recommended }) => {
          const val = config[key]
          const diff = val - recommended
          const diffLabel = val === 0
            ? 'No reduction set'
            : Math.abs(diff) <= 5
            ? 'Close to typical'
            : diff > 0
            ? `+${diff}% above typical`
            : `${diff}% below typical`
          const diffColor = val === 0
            ? 'text-gray-400'
            : Math.abs(diff) <= 5
            ? 'text-green-600'
            : diff > 5
            ? 'text-orange-500'
            : 'text-gray-500'

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-bold text-brand-orange">{val}%</span>
                  <p className={`text-xs ${diffColor}`}>{diffLabel}</p>
                </div>
              </div>
              <Slider
                min={0}
                max={80}
                step={5}
                value={[val]}
                onValueChange={([v]) => onChange({ ...config, [key]: v })}
                className="w-full"
              />
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-brand-orange/50" />
                Typical for this category: <strong className="text-gray-500">{recommended}%</strong>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
