import * as XLSX from 'xlsx'
import type { EstimateData, EstimateFeature, PlatformCostSummary } from '@/types/estimate'

// ── helpers ──────────────────────────────────────────────────────────────────

function currency(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function pct(n: number) {
  return n > 0 ? `${n}h` : '—'
}

// ── Tab 1: Costing Summary ────────────────────────────────────────────────────

function buildCostingSheet(estimate: EstimateData): XLSX.WorkSheet {
  const { byPlatform, grandTotalHours, grandTotalCost, timeline } = estimate.costingSummary

  const rows: (string | number)[][] = []

  // Title
  rows.push([estimate.projectName, '', '', '', '', '', '', ''])
  rows.push([`Client: ${estimate.client}`, '', '', '', '', '', '', ''])
  rows.push([`Timeline: ${timeline}`, '', '', '', '', '', '', ''])
  rows.push([])

  // Header
  rows.push([
    'Role / Category',
    ...byPlatform.map(p => p.platform),
    'Total Hours',
    'Total Cost',
  ])

  // Roles
  const roleGroups: { label: string; hoursKey: keyof PlatformCostSummary; costKey: keyof PlatformCostSummary }[] = [
    { label: 'UI/UX Design', hoursKey: 'designHours', costKey: 'designCost' },
    { label: 'Frontend Development', hoursKey: 'frontendHours', costKey: 'frontendCost' },
    { label: 'Backend Development', hoursKey: 'backendHours', costKey: 'backendCost' },
    { label: 'QA & Testing', hoursKey: 'qaHours', costKey: 'qaCost' },
    { label: 'Project Management', hoursKey: 'pmHours', costKey: 'pmCost' },
    { label: 'DevOps & Infrastructure', hoursKey: 'devopsHours', costKey: 'devopsCost' },
  ]

  for (const role of roleGroups) {
    const hours = byPlatform.map(p => p[role.hoursKey] as number)
    const costs = byPlatform.map(p => p[role.costKey] as number)
    const totalH = hours.reduce((a, b) => a + b, 0)
    const totalC = costs.reduce((a, b) => a + b, 0)
    if (totalH === 0) continue // skip roles with no hours

    rows.push([
      role.label,
      ...hours.map(h => (h > 0 ? h : '')),
      totalH || '',
      totalC > 0 ? currency(totalC) : '',
    ])
  }

  rows.push([]) // spacer

  // Hours subtotal
  rows.push([
    'Total Hours',
    ...byPlatform.map(p => p.totalHours),
    grandTotalHours,
    '',
  ])

  // Cost subtotal
  rows.push([
    'Total Cost',
    ...byPlatform.map(p => currency(p.totalCost)),
    '',
    currency(grandTotalCost),
  ])

  rows.push([])
  rows.push([`Grand Total: ${currency(grandTotalCost)} | Timeline: ${timeline}`])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 28 },
    ...byPlatform.map(() => ({ wch: 20 })),
    { wch: 14 },
    { wch: 16 },
  ]

  return ws
}

// ── Tab 2: Feature Listing ────────────────────────────────────────────────────

function buildFeaturesSheet(estimate: EstimateData): XLSX.WorkSheet {
  const rows: (string | number | boolean)[][] = []

  // Title
  rows.push([`${estimate.projectName} — Detailed Feature Breakdown`])
  rows.push([`Client: ${estimate.client}`])
  rows.push([])

  // Header
  rows.push([
    'Platform',
    'Module',
    'Feature',
    'Description',
    'Design (hrs)',
    'Frontend (hrs)',
    'Backend (hrs)',
    'QA (hrs)',
    'PM (hrs)',
    'Total (hrs)',
    'Shared Backend?',
    'Notes',
  ])

  // Group by platform for readability
  const platforms = estimate.platforms
  for (const platform of platforms) {
    const features = estimate.features.filter((f: EstimateFeature) => f.platform === platform)
    if (features.length === 0) continue

    let firstInPlatform = true
    for (const feat of features) {
      rows.push([
        firstInPlatform ? platform : '',
        feat.module,
        feat.feature,
        feat.description,
        feat.designHours || '',
        feat.frontendHours || '',
        feat.backendHours || '',
        feat.qaHours || '',
        feat.pmHours || '',
        feat.totalHours,
        feat.isSharedBackend ? 'Yes' : '',
        feat.sharedNote || '',
      ])
      firstInPlatform = false
    }

    // Platform subtotal row
    const totalH = features.reduce((a: number, f: EstimateFeature) => a + f.totalHours, 0)
    const totalD = features.reduce((a: number, f: EstimateFeature) => a + (f.designHours || 0), 0)
    const totalFe = features.reduce((a: number, f: EstimateFeature) => a + (f.frontendHours || 0), 0)
    const totalBe = features.reduce((a: number, f: EstimateFeature) => a + (f.backendHours || 0), 0)
    const totalQa = features.reduce((a: number, f: EstimateFeature) => a + (f.qaHours || 0), 0)
    const totalPm = features.reduce((a: number, f: EstimateFeature) => a + (f.pmHours || 0), 0)

    rows.push([
      `${platform} Subtotal`,
      '',
      '',
      '',
      totalD || '',
      totalFe || '',
      totalBe || '',
      totalQa || '',
      totalPm || '',
      totalH,
      '',
      '',
    ])
    rows.push([]) // spacer between platforms
  }

  // Grand total
  const grandTotal = estimate.features.reduce((a: number, f: EstimateFeature) => a + f.totalHours, 0)
  rows.push([
    'GRAND TOTAL',
    '', '', '',
    estimate.features.reduce((a: number, f: EstimateFeature) => a + (f.designHours || 0), 0) || '',
    estimate.features.reduce((a: number, f: EstimateFeature) => a + (f.frontendHours || 0), 0) || '',
    estimate.features.reduce((a: number, f: EstimateFeature) => a + (f.backendHours || 0), 0) || '',
    estimate.features.reduce((a: number, f: EstimateFeature) => a + (f.qaHours || 0), 0) || '',
    estimate.features.reduce((a: number, f: EstimateFeature) => a + (f.pmHours || 0), 0) || '',
    grandTotal,
    '', '',
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  ws['!cols'] = [
    { wch: 22 }, // Platform
    { wch: 22 }, // Module
    { wch: 30 }, // Feature
    { wch: 40 }, // Description
    { wch: 14 }, // Design
    { wch: 16 }, // Frontend
    { wch: 16 }, // Backend
    { wch: 12 }, // QA
    { wch: 12 }, // PM
    { wch: 12 }, // Total
    { wch: 16 }, // Shared?
    { wch: 45 }, // Notes
  ]

  return ws
}

// ── Main export function ──────────────────────────────────────────────────────

export async function exportEstimateToXls(estimate: EstimateData): Promise<void> {
  const wb = XLSX.utils.book_new()

  const costingSheet = buildCostingSheet(estimate)
  const featuresSheet = buildFeaturesSheet(estimate)

  XLSX.utils.book_append_sheet(wb, costingSheet, 'Costing')
  XLSX.utils.book_append_sheet(wb, featuresSheet, 'Feature Breakdown')

  const filename = `${estimate.projectName.replace(/[^a-zA-Z0-9\s]/g, '').trim()}_Estimate.xlsx`
  XLSX.writeFile(wb, filename)
}
