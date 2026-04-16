import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  PageBreak, convertInchesToTwip, Header, Footer,
  type FileChild,
} from 'docx'
import { saveAs } from 'file-saver'
import type { ProposalData, ProjectInfo, CompanyConfig } from '../types/proposal'
import { DEFAULT_COMPANY } from './companies'
import { formatCurrency } from './utils'

// Content width: US Letter (12240) minus 1" margins each side (1440*2) = 9360 DXA
const CONTENT_W = 9360

let BRAND = 'E86500'
const WHITE = 'FFFFFF'
const DARK = '1E1E1E'
let LIGHT_BG = 'FFF5EE'
let ALT_ROW = 'FFF8F3'
const BORDER_COLOR = 'E0E0E0'

function brandText(text: string, bold = false, size = 22): TextRun {
  return new TextRun({ text, bold, color: BRAND, size, font: 'Calibri' })
}

function darkText(text: string, bold = false, size = 20): TextRun {
  return new TextRun({ text, bold, color: DARK, size, font: 'Calibri' })
}

function bodyText(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, color: DARK, size: 20, font: 'Calibri' })
}

function tableHeaderCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: WHITE, size: 18, font: 'Calibri' })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 60, after: 60 },
    })],
    shading: { fill: BRAND, type: ShadingType.CLEAR, color: BRAND },
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  })
}

function tableBodyCell(text: string, alt = false, bold = false, color = DARK, width?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold, color, size: 18, font: 'Calibri' })],
      spacing: { before: 40, after: 40 },
    })],
    shading: alt ? { fill: ALT_ROW, type: ShadingType.CLEAR, color: ALT_ROW } : undefined,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  })
}

function sectionHeading(num: string, title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num} · `, bold: true, size: 28, color: DARK, font: 'Calibri' }),
      new TextRun({ text: title, bold: true, size: 28, color: DARK, font: 'Calibri' }),
    ],
    spacing: { before: 400, after: 200 },
    border: { bottom: { color: BORDER_COLOR, size: 6, style: BorderStyle.SINGLE } },
  })
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: BRAND, font: 'Calibri' })],
    spacing: { before: 240, after: 120 },
  })
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [bodyText(text)],
    spacing: { before: 80, after: 80 },
    alignment: AlignmentType.JUSTIFIED,
  })
}

function bulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: [bodyText(text)],
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
  })
}

function riskColor(level: string): string {
  if (level === 'High') return 'C0392B'
  if (level === 'Medium') return 'E67E22'
  return '27AE60'
}

function coverPage(data: ProposalData, info: ProjectInfo, company: CompanyConfig): FileChild[] {
  // Cover info table: 2 columns summing to 5000 DXA
  const COL_LABEL = 1500
  const COL_VALUE = 3500

  return [
    new Paragraph({
      children: [
        new TextRun({ text: company.name, bold: true, size: 28, color: BRAND, font: 'Calibri' }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 80 },
    }),
    new Paragraph({
      children: [darkText(company.website, false, 18)],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [darkText(company.phone, false, 18)],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [darkText(company.email, false, 18)],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 1200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: data.project.name, bold: true, size: 72, color: DARK, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      children: [brandText(data.project.subtitle, false, 36)],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [darkText('Technical Proposal & Engagement Plan', false, 24)],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
    }),
    // Cover info table
    new Table({
      width: { size: COL_LABEL + COL_VALUE, type: WidthType.DXA },
      columnWidths: [COL_LABEL, COL_VALUE],
      rows: [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [darkText('Prepared by:', true)] })], width: { size: COL_LABEL, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
          new TableCell({ children: [new Paragraph({ children: [darkText(company.name)] })], width: { size: COL_VALUE, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [darkText('Prepared for:', true)] })], width: { size: COL_LABEL, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
          new TableCell({ children: [new Paragraph({ children: [darkText(data.project.client)] })], width: { size: COL_VALUE, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [darkText('Date:', true)] })], width: { size: COL_LABEL, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
          new TableCell({ children: [new Paragraph({ children: [darkText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))] })], width: { size: COL_VALUE, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [darkText('Version:', true)] })], width: { size: COL_LABEL, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
          new TableCell({ children: [new Paragraph({ children: [darkText(`${data.project.version} — CONFIDENTIAL`)] })], width: { size: COL_VALUE, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [darkText('Engagement:', true)] })], width: { size: COL_LABEL, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
          new TableCell({ children: [new Paragraph({ children: [darkText(data.project.engagementType)] })], width: { size: COL_VALUE, type: WidthType.DXA }, margins: { left: 80, right: 80, top: 60, bottom: 60 } }),
        ]}),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

function executiveSummarySection(data: ProposalData): FileChild[] {
  const es = data.executiveSummary
  // 3-col KPI table, equal thirds
  const KPI_COL = Math.floor(CONTENT_W / 3)  // 3120 each
  const KPI_LAST = CONTENT_W - KPI_COL * 2   // 3120

  const items: (Paragraph | Table)[] = [
    sectionHeading('01', 'Executive Summary'),
    bodyParagraph(es.text),
    new Paragraph({ spacing: { before: 200 } }),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [KPI_COL, KPI_COL, KPI_LAST],
      rows: [
        new TableRow({ children: [
          tableHeaderCell('ENGAGEMENT TYPE', KPI_COL),
          tableHeaderCell('TOTAL PRODUCT COST', KPI_COL),
          tableHeaderCell('TOTAL TIMELINE', KPI_LAST),
        ]}),
        new TableRow({ children: [
          tableBodyCell(data.project.engagementType, false, true, DARK, KPI_COL),
          tableBodyCell(`~${formatCurrency(es.totalCost)}`, false, true, BRAND, KPI_COL),
          tableBodyCell(`~${es.totalTimeline}`, false, true, BRAND, KPI_LAST),
        ]}),
      ],
    }),
    new Paragraph({ spacing: { before: 200 } }),
  ]

  if (es.phaseBreakdown?.length) {
    const n = es.phaseBreakdown.length
    const colW = Math.floor(CONTENT_W / n)
    const colWidths = Array.from({ length: n }, (_, i) => i === n - 1 ? CONTENT_W - colW * (n - 1) : colW)

    items.push(
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [
          new TableRow({ children: es.phaseBreakdown.map((p, i) => tableHeaderCell(p.name, colWidths[i])) }),
          new TableRow({ children: es.phaseBreakdown.map((p, i) => tableBodyCell(formatCurrency(p.cost), i % 2 === 1, true, BRAND, colWidths[i])) }),
          new TableRow({ children: es.phaseBreakdown.map((p, i) => tableBodyCell(p.duration, i % 2 === 1, false, DARK, colWidths[i])) }),
          new TableRow({ children: es.phaseBreakdown.map((p, i) => tableBodyCell(p.description, i % 2 === 1, false, DARK, colWidths[i])) }),
        ],
      })
    )
  }

  items.push(new Paragraph({ children: [new PageBreak()] }))
  return items
}

function projectUnderstandingSection(data: ProposalData): FileChild[] {
  const pu = data.projectUnderstanding
  // User types table: 2 cols — 2500 + 6860 = 9360
  const UT_C1 = 2500, UT_C2 = CONTENT_W - UT_C1

  const items: (Paragraph | Table)[] = [
    sectionHeading('02', 'Project Understanding'),
    subHeading(`2.1 What ${data.project.name} Is`),
    bodyParagraph(pu.whatItIs),
    subHeading('2.2 Problem Being Solved'),
    bodyParagraph(pu.problemSolving),
    subHeading('2.3 Key Features'),
    ...pu.keyFeatures.map(f => bulletPoint(f)),
  ]

  if (pu.userTypes?.length) {
    items.push(subHeading('2.4 User Types'))
    items.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [UT_C1, UT_C2],
      rows: [
        new TableRow({ children: [tableHeaderCell('User Type', UT_C1), tableHeaderCell('Description', UT_C2)] }),
        ...pu.userTypes.map((u, i) => new TableRow({ children: [
          tableBodyCell(u.type, i % 2 === 1, true, DARK, UT_C1),
          tableBodyCell(u.description, i % 2 === 1, false, DARK, UT_C2),
        ]})),
      ],
    }))
  }

  items.push(new Paragraph({ children: [new PageBreak()] }))
  return items
}

function objectivesSection(data: ProposalData): FileChild[] {
  const obj = data.objectives
  // Success criteria: 3 cols — 2500 + 2000 + 4860 = 9360
  const SC_C1 = 2500, SC_C2 = 2000, SC_C3 = CONTENT_W - SC_C1 - SC_C2

  const items: (Paragraph | Table)[] = [
    sectionHeading('03', 'Objectives & Success Criteria'),
    subHeading('3.1 Delivery Objectives'),
    ...obj.delivery.map(d => bulletPoint(d)),
    subHeading('3.2 Success Criteria'),
  ]

  if (obj.successCriteria?.length) {
    items.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [SC_C1, SC_C2, SC_C3],
      rows: [
        new TableRow({ children: [tableHeaderCell('Metric', SC_C1), tableHeaderCell('Target', SC_C2), tableHeaderCell('Validation Method', SC_C3)] }),
        ...obj.successCriteria.map((sc, i) => new TableRow({ children: [
          tableBodyCell(sc.metric, i % 2 === 1, true, DARK, SC_C1),
          tableBodyCell(sc.target, i % 2 === 1, false, BRAND, SC_C2),
          tableBodyCell(sc.validationMethod, i % 2 === 1, false, DARK, SC_C3),
        ]})),
      ],
    }))
  }

  items.push(new Paragraph({ children: [new PageBreak()] }))
  return items
}

function proposedSolutionSection(data: ProposalData): FileChild[] {
  const ps = data.proposedSolution
  // Architecture pillars: 3 cols — 2000 + 2000 + 5360 = 9360
  const AP_C1 = 2000, AP_C2 = 2000, AP_C3 = CONTENT_W - AP_C1 - AP_C2

  const items: (Paragraph | Table)[] = [
    sectionHeading('04', 'Proposed Solution Overview'),
    bodyParagraph(ps.overview),
    subHeading('4.1 Architecture Pillars'),
  ]

  if (ps.architecturePillars?.length) {
    items.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [AP_C1, AP_C2, AP_C3],
      rows: [
        new TableRow({ children: [tableHeaderCell('Pillar', AP_C1), tableHeaderCell('Technology', AP_C2), tableHeaderCell('Role / Description', AP_C3)] }),
        ...ps.architecturePillars.map((p, i) => new TableRow({ children: [
          tableBodyCell(p.name, i % 2 === 1, true, DARK, AP_C1),
          tableBodyCell(p.technology, i % 2 === 1, false, BRAND, AP_C2),
          tableBodyCell(p.description, i % 2 === 1, false, DARK, AP_C3),
        ]})),
      ],
    }))
  }

  items.push(new Paragraph({ children: [new PageBreak()] }))
  return items
}

function techStackSection(data: ProposalData): FileChild[] {
  // Tech stack: 3 cols — 2500 + 2500 + 4360 = 9360
  const TS_C1 = 2500, TS_C2 = 2500, TS_C3 = CONTENT_W - TS_C1 - TS_C2

  const items: (Paragraph | Table)[] = [
    sectionHeading('05', 'Technical Architecture'),
    subHeading('5.1 Recommended Technology Stack'),
  ]

  if (data.techStack?.length) {
    items.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [TS_C1, TS_C2, TS_C3],
      rows: [
        new TableRow({ children: [tableHeaderCell('Layer', TS_C1), tableHeaderCell('Technology', TS_C2), tableHeaderCell('Justification', TS_C3)] }),
        ...data.techStack.map((t, i) => new TableRow({ children: [
          tableBodyCell(t.layer, i % 2 === 1, true, DARK, TS_C1),
          tableBodyCell(t.technology, i % 2 === 1, false, BRAND, TS_C2),
          tableBodyCell(t.justification, i % 2 === 1, false, DARK, TS_C3),
        ]})),
      ],
    }))
  }

  items.push(new Paragraph({ children: [new PageBreak()] }))
  return items
}

function costSection(data: ProposalData): FileChild[] {
  const ce = data.costEstimation
  const hasAI = ce.summary.totalHoursSaved > 0

  const items: (Paragraph | Table)[] = [
    sectionHeading('06', 'Development Approach, Methodology & Cost Estimation'),
    subHeading('6.1 Delivery Methodology'),
    bodyParagraph(data.methodology.approach),
    subHeading('6.2 Cost Estimation'),
  ]

  if (hasAI) {
    items.push(new Paragraph({
      children: [
        new TextRun({ text: 'AI-Assisted Development Note: ', bold: true, size: 18, color: BRAND, font: 'Calibri' }),
        new TextRun({ text: 'All hour estimates reflect AI-tool-assisted development. Base hours show the traditional estimate; AI-Reduced hours show the actual engagement cost after applying AI efficiency factors.', size: 18, color: DARK, font: 'Calibri' }),
      ],
      shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
      spacing: { before: 80, after: 200 },
      indent: { left: 160, right: 160 },
    }))
  }

  if (ce.modules?.length) {
    if (hasAI) {
      // 7 cols with AI: 2000+2200+850+850+760+1000+1700 = 9360
      const C = [2000, 2200, 850, 850, 760, 1000, 1700]
      items.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: C,
        rows: [
          new TableRow({ children: [
            tableHeaderCell('Phase/Module', C[0]),
            tableHeaderCell('Features', C[1]),
            tableHeaderCell('Base Hrs', C[2]),
            tableHeaderCell('AI Hrs', C[3]),
            tableHeaderCell('Saved', C[4]),
            tableHeaderCell('Cost', C[5]),
            tableHeaderCell('Notes', C[6]),
          ]}),
          ...ce.modules.map((m, i) => new TableRow({ children: [
            tableBodyCell(`${m.phase}: ${m.name}`, i % 2 === 1, true, DARK, C[0]),
            tableBodyCell(m.features.slice(0, 4).join(', ') + (m.features.length > 4 ? '...' : ''), i % 2 === 1, false, DARK, C[1]),
            tableBodyCell(`${m.baseHours}h`, i % 2 === 1, false, DARK, C[2]),
            tableBodyCell(`${m.aiReducedHours}h`, i % 2 === 1, true, BRAND, C[3]),
            tableBodyCell(`${m.hoursSaved}h`, i % 2 === 1, false, '27AE60', C[4]),
            tableBodyCell(formatCurrency(m.cost), i % 2 === 1, true, DARK, C[5]),
            tableBodyCell(m.notes || '—', i % 2 === 1, false, DARK, C[6]),
          ]})),
          new TableRow({ children: [
            tableHeaderCell('TOTAL', C[0]),
            tableHeaderCell('', C[1]),
            tableHeaderCell(`${ce.summary.totalBaseHours}h`, C[2]),
            tableHeaderCell(`${ce.summary.totalAIReducedHours}h`, C[3]),
            tableHeaderCell(`${ce.summary.totalHoursSaved}h`, C[4]),
            tableHeaderCell(formatCurrency(ce.summary.totalCost), C[5]),
            tableHeaderCell(`AI saves ${formatCurrency(ce.summary.aiSavingsAmount)}`, C[6]),
          ]}),
        ],
      }))
    } else {
      // 5 cols without AI: 2400+3000+1200+1200+1560 = 9360
      const C = [2400, 3000, 1200, 1200, 1560]
      items.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: C,
        rows: [
          new TableRow({ children: [
            tableHeaderCell('Phase/Module', C[0]),
            tableHeaderCell('Features', C[1]),
            tableHeaderCell('Hours', C[2]),
            tableHeaderCell('Cost', C[3]),
            tableHeaderCell('Notes', C[4]),
          ]}),
          ...ce.modules.map((m, i) => new TableRow({ children: [
            tableBodyCell(`${m.phase}: ${m.name}`, i % 2 === 1, true, DARK, C[0]),
            tableBodyCell(m.features.slice(0, 4).join(', ') + (m.features.length > 4 ? '...' : ''), i % 2 === 1, false, DARK, C[1]),
            tableBodyCell(`${m.aiReducedHours}h`, i % 2 === 1, false, DARK, C[2]),
            tableBodyCell(formatCurrency(m.cost), i % 2 === 1, true, DARK, C[3]),
            tableBodyCell(m.notes || '—', i % 2 === 1, false, DARK, C[4]),
          ]})),
          new TableRow({ children: [
            tableHeaderCell('TOTAL', C[0]),
            tableHeaderCell('', C[1]),
            tableHeaderCell(`${ce.summary.totalAIReducedHours}h`, C[2]),
            tableHeaderCell(formatCurrency(ce.summary.totalCost), C[3]),
            tableHeaderCell('', C[4]),
          ]}),
        ],
      }))
    }
  }

  items.push(new Paragraph({ spacing: { before: 400 } }))
  items.push(subHeading('6.3 Resources & Costing'))

  // Resources: 5 cols — 2200+1200+1200+1200+3560 = 9360
  const R = [2200, 1200, 1200, 1200, 3560]
  if (ce.rolesRequired?.length) {
    items.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: R,
      rows: [
        new TableRow({ children: [
          tableHeaderCell('Resource', R[0]),
          tableHeaderCell('Hourly Rate', R[1]),
          tableHeaderCell('Total Hours', R[2]),
          tableHeaderCell('Total Cost', R[3]),
          tableHeaderCell('Responsibility', R[4]),
        ]}),
        ...ce.rolesRequired.map((r, i) => new TableRow({ children: [
          tableBodyCell(r.role, i % 2 === 1, true, DARK, R[0]),
          tableBodyCell(`$${r.rate}/hr`, i % 2 === 1, false, BRAND, R[1]),
          tableBodyCell(`${r.totalHours}h`, i % 2 === 1, false, DARK, R[2]),
          tableBodyCell(formatCurrency(r.totalCost), i % 2 === 1, true, DARK, R[3]),
          tableBodyCell(r.responsibility, i % 2 === 1, false, DARK, R[4]),
        ]})),
      ],
    }))
  }

  items.push(new Paragraph({
    children: [darkText('Note: ', true), darkText('Infrastructure costs are variable and will scale based on actual user load. All third-party costs will be borne by the client.')],
    spacing: { before: 160, after: 80 },
  }))

  items.push(subHeading('6.4 Payment Structure'))
  items.push(bodyParagraph(data.methodology.paymentStructure))
  items.push(new Paragraph({ children: [new PageBreak()] }))
  return items
}

function risksSection(data: ProposalData): FileChild[] {
  // Risks: 4 cols — 3000+1200+1200+3960 = 9360
  const RK = [3000, 1200, 1200, 3960]
  const items: (Paragraph | Table)[] = [
    sectionHeading('07', 'Risks & Mitigation'),
  ]

  if (data.risks?.length) {
    items.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: RK,
      rows: [
        new TableRow({ children: [
          tableHeaderCell('Risk', RK[0]),
          tableHeaderCell('Likelihood', RK[1]),
          tableHeaderCell('Impact', RK[2]),
          tableHeaderCell('Mitigation', RK[3]),
        ]}),
        ...data.risks.map((r, i) => new TableRow({ children: [
          tableBodyCell(r.risk, i % 2 === 1, false, DARK, RK[0]),
          tableBodyCell(r.likelihood, i % 2 === 1, true, riskColor(r.likelihood), RK[1]),
          tableBodyCell(r.impact, i % 2 === 1, true, riskColor(r.impact), RK[2]),
          tableBodyCell(r.mitigation, i % 2 === 1, false, DARK, RK[3]),
        ]})),
      ],
    }))
  }

  items.push(new Paragraph({ children: [new PageBreak()] }))
  return items
}

function governanceSection(data: ProposalData, company: CompanyConfig): FileChild[] {
  const gov = data.governance
  const items: (Paragraph | Table)[] = [
    sectionHeading('08', 'Communication & Governance'),
    subHeading('Reporting Cadence'),
    ...gov.reportingCadence.map(r => bulletPoint(r)),
    subHeading('Change Request Process'),
    ...gov.changeRequestProcess.map(r => bulletPoint(r)),
    subHeading('Phase Sign-Off Protocol'),
    bodyParagraph(gov.phaseSignOff),
    subHeading('Escalation Path'),
    ...gov.escalationPath.map(r => bulletPoint(r)),
  ]

  if (data.assumptions?.length) {
    items.push(new Paragraph({ children: [new PageBreak()] }))
    items.push(sectionHeading('09', 'Assumptions & Open Questions'))
    items.push(subHeading('Assumptions'))
    items.push(...data.assumptions.map(a => bulletPoint(a)))
    if (data.openQuestions?.length) {
      items.push(subHeading('Open Questions'))
      items.push(...data.openQuestions.map(q => bulletPoint(q)))
    }
  }

  items.push(new Paragraph({ spacing: { before: 800 } }))
  items.push(new Paragraph({
    children: [new TextRun({ text: `Thank you for the opportunity to propose on ${data.project.name}.`, bold: true, size: 22, color: DARK, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
  }))
  items.push(new Paragraph({
    children: [new TextRun({ text: company.tagline, italics: true, size: 20, color: BRAND, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
  }))

  return items
}

export async function exportToDocx(data: ProposalData, info: ProjectInfo, company: CompanyConfig = DEFAULT_COMPANY): Promise<void> {
  BRAND = company.brandHex
  ALT_ROW = company.brand50.replace('#', '')
  LIGHT_BG = company.brand50.replace('#', '')

  const allSections = [
    ...coverPage(data, info, company),
    ...executiveSummarySection(data),
    ...projectUnderstandingSection(data),
    ...objectivesSection(data),
    ...proposedSolutionSection(data),
    ...techStackSection(data),
    ...costSection(data),
    ...risksSection(data),
    ...governanceSection(data, company),
  ]

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: company.name, bold: true, size: 16, color: BRAND, font: 'Calibri' }),
                new TextRun({ text: '    |    ', size: 16, color: BORDER_COLOR, font: 'Calibri' }),
                new TextRun({ text: data.project.name, size: 16, color: DARK, font: 'Calibri' }),
              ],
              alignment: AlignmentType.RIGHT,
              border: { bottom: { color: BORDER_COLOR, size: 4, style: BorderStyle.SINGLE } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: company.name, size: 14, color: DARK, font: 'Calibri' }),
                new TextRun({ text: `    ${company.website}    ${company.phone}`, size: 14, color: BRAND, font: 'Calibri' }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { color: BORDER_COLOR, size: 4, style: BorderStyle.SINGLE } },
            }),
          ],
        }),
      },
      children: allSections,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${data.project.name.replace(/\s+/g, '_')}_Proposal_v${data.project.version}.docx`
  saveAs(blob, filename)
}
