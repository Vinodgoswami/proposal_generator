import type { ProposalData, ProjectInfo, CompanyConfig } from '../types/proposal'
import { DEFAULT_COMPANY } from './companies'
import { formatCurrency } from './utils'

const DARK = '#1E1E1E'
const WHITE = '#FFFFFF'
const BORDER = '#E0E0E0'

function riskBadge(level: string): string {
  const colors: Record<string, string> = {
    High: 'background:#FDECEA;color:#C0392B;border:1px solid #E9B4B0;',
    Medium: 'background:#FEF0E7;color:#E67E22;border:1px solid #F4C99A;',
    Low: 'background:#EAFAF1;color:#27AE60;border:1px solid #A9DFC0;',
  }
  return `<span style="${colors[level] || ''}padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">${level}</span>`
}

export function generateProposalHTML(data: ProposalData, info: ProjectInfo, company: CompanyConfig = DEFAULT_COMPANY): string {
  const BRAND = company.brandColor
  const ALT_ROW = company.brand50

  // ── Local helpers (use BRAND/ALT_ROW from closure) ────────────────────────

  const th = (text: string, width = ''): string =>
    `<th style="background:${BRAND};color:${WHITE};padding:8px 10px;text-align:left;font-size:12px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;${width ? `width:${width};` : ''}">${text}</th>`

  const td = (text: string, alt = false, bold = false, color = DARK, small = false): string => {
    const bg = alt ? ALT_ROW : WHITE
    return `<td style="background:${bg};color:${color};padding:7px 10px;font-size:${small ? '11px' : '12px'};font-weight:${bold ? '700' : '400'};border-bottom:1px solid ${BORDER};vertical-align:top;">${text}</td>`
  }

  const tbl = (headers: string[], rows: string[][], widths: string[] = []): string => {
    const headerRow = headers.map((h, i) => th(h, widths[i] || '')).join('')
    const bodyRows = rows.map((row, ri) =>
      `<tr>${row.map(cell => td(cell, ri % 2 === 1)).join('')}</tr>`
    ).join('')
    return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${headerRow ? `<thead><tr>${headerRow}</tr></thead>` : ''}<tbody>${bodyRows}</tbody></table>`
  }

  const sec = (num: string, title: string): string =>
    `<h2 style="font-size:18px;font-weight:700;color:${DARK};border-bottom:2px solid ${BORDER};padding-bottom:8px;margin:36px 0 16px;">${num} · ${title}</h2>`

  const sub = (text: string): string =>
    `<h3 style="font-size:14px;font-weight:700;color:${BRAND};margin:20px 0 8px;">${text}</h3>`

  const p = (text: string): string =>
    `<p style="font-size:13px;color:${DARK};line-height:1.7;margin-bottom:10px;text-align:justify;">${text}</p>`

  const ul = (items: string[]): string =>
    `<ul style="margin:0 0 12px 20px;padding:0;">${items.map(i => `<li style="font-size:13px;color:${DARK};line-height:1.6;margin-bottom:4px;">${i}</li>`).join('')}</ul>`

  const infoBox = (text: string): string =>
    `<div style="background:${ALT_ROW};border:1px solid ${company.brand200};border-radius:4px;padding:10px 14px;margin-bottom:16px;font-size:12px;">${text}</div>`

  // ── Sections ──────────────────────────────────────────────────────────────

  const { executiveSummary: es, costEstimation: ce } = data

  const coverSection = `
    <div style="text-align:center;padding:40px 0 30px;border-bottom:3px solid ${BRAND};">
      <p style="color:${BRAND};font-weight:700;font-size:16px;margin-bottom:24px;">${info.preparedBy || company.name}</p>
      <h1 style="font-size:48px;font-weight:900;color:${DARK};margin:0 0 10px;">${data.project.name}</h1>
      <p style="font-size:24px;font-weight:600;color:${BRAND};margin:0 0 8px;">${data.project.subtitle}</p>
      <p style="font-size:14px;color:#666;margin-bottom:32px;">Technical Proposal &amp; Engagement Plan</p>
      <table style="display:inline-table;border:1px solid ${BORDER};border-collapse:collapse;text-align:left;">
        ${[
          ['Prepared by', info.preparedBy || company.name],
          ['Prepared for', data.project.client],
          ['Date', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
          ['Version', `${data.project.version} — CONFIDENTIAL`],
          ['Engagement', data.project.engagementType],
        ].map(([k, v]) => `
          <tr>
            <td style="background:#F5F5F5;font-weight:600;font-size:12px;padding:8px 16px;border-bottom:1px solid ${BORDER};width:140px;">${k}</td>
            <td style="font-size:12px;padding:8px 16px;border-bottom:1px solid ${BORDER};">${v}</td>
          </tr>`).join('')}
      </table>
    </div>`

  const execSection = `
    ${sec('01', 'Executive Summary')}
    ${p(es.text)}
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr>
        ${th('ENGAGEMENT TYPE')}${th('TOTAL PRODUCT COST')}${th('TOTAL TIMELINE')}${th('AI SAVINGS')}
      </tr></thead>
      <tbody><tr>
        ${td(data.project.engagementType, false, true)}
        ${td(`~${formatCurrency(es.totalCost)}`, false, true, BRAND)}
        ${td(`~${es.totalTimeline}`, false, true, BRAND)}
        ${td(formatCurrency(ce.summary.aiSavingsAmount), false, true, '#27AE60')}
      </tr></tbody>
    </table>
    ${es.phaseBreakdown?.length ? tbl(
      es.phaseBreakdown.map(p2 => p2.name),
      [
        es.phaseBreakdown.map(p2 => `<strong style="color:${BRAND}">${formatCurrency(p2.cost)}</strong>`),
        es.phaseBreakdown.map(p2 => p2.duration),
        es.phaseBreakdown.map(p2 => p2.description),
      ]
    ) : ''}`

  const understandingSection = `
    ${sec('02', 'Project Understanding')}
    ${sub(`2.1 What ${data.project.name} Is`)}${p(data.projectUnderstanding.whatItIs)}
    ${sub('2.2 Problem Being Solved')}${p(data.projectUnderstanding.problemSolving)}
    ${sub('2.3 Key Features')}${ul(data.projectUnderstanding.keyFeatures)}
    ${data.projectUnderstanding.userTypes?.length ? `
      ${sub('2.4 User Types')}
      ${tbl(['User Type', 'Description'],
        data.projectUnderstanding.userTypes.map(u => [`<strong>${u.type}</strong>`, u.description]),
        ['200px', ''])}` : ''}`

  const objectivesSection = `
    ${sec('03', 'Objectives & Success Criteria')}
    ${sub('3.1 Delivery Objectives')}${ul(data.objectives.delivery)}
    ${sub('3.2 Success Criteria')}
    ${tbl(
      ['Metric', 'Target', 'Validation Method'],
      data.objectives.successCriteria.map(sc => [
        `<strong>${sc.metric}</strong>`,
        `<span style="color:${BRAND};font-weight:600">${sc.target}</span>`,
        sc.validationMethod,
      ]),
      ['220px', '150px', '']
    )}`

  const solutionSection = `
    ${sec('04', 'Proposed Solution Overview')}
    ${p(data.proposedSolution.overview)}
    ${sub('4.1 Architecture Pillars')}
    ${tbl(
      ['Pillar', 'Technology', 'Description'],
      data.proposedSolution.architecturePillars.map(ap => [
        `<strong>${ap.name}</strong>`,
        `<span style="color:${BRAND}">${ap.technology}</span>`,
        ap.description,
      ]),
      ['180px', '180px', '']
    )}`

  const techSection = `
    ${sec('05', 'Technical Architecture')}
    ${sub('5.1 Technology Stack')}
    ${tbl(
      ['Layer', 'Technology', 'Justification'],
      data.techStack.map(t => [
        `<strong>${t.layer}</strong>`,
        `<span style="color:${BRAND}">${t.technology}</span>`,
        t.justification,
      ]),
      ['180px', '180px', '']
    )}`

  const costSection = `
    ${sec('06', 'Development Approach & Cost Estimation')}
    ${p(data.methodology.approach)}
    ${infoBox(`<strong style="color:${BRAND}">AI-Assisted Development:</strong> Base hours = traditional estimate without AI tools. AI-Reduced hours = actual engagement using AI assistance. Cost is calculated on AI-reduced hours only.`)}
    ${sub('6.2 Module Cost Breakdown')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr>
        ${th('Phase / Module', '200px')}${th('Features', '')}${th('Base Hrs', '80px')}${th('AI Hrs', '80px')}${th('Saved', '70px')}${th('Cost', '90px')}
      </tr></thead>
      <tbody>
        ${ce.modules.map((m, i) => `<tr>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:12px;font-weight:700;border-bottom:1px solid ${BORDER};vertical-align:top;">${m.phase}: ${m.name}</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:11px;color:#555;border-bottom:1px solid ${BORDER};vertical-align:top;">${m.features.slice(0, 4).join(', ')}${m.features.length > 4 ? '…' : ''}</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:12px;border-bottom:1px solid ${BORDER};text-align:center;">${m.baseHours}h</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:12px;font-weight:700;color:${BRAND};border-bottom:1px solid ${BORDER};text-align:center;">${m.aiReducedHours}h</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:12px;color:#27AE60;font-weight:600;border-bottom:1px solid ${BORDER};text-align:center;">↓${m.hoursSaved}h</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:12px;font-weight:700;border-bottom:1px solid ${BORDER};text-align:right;">${formatCurrency(m.cost)}</td>
        </tr>`).join('')}
        <tr style="background:${BRAND};">
          <td style="padding:9px 10px;color:${WHITE};font-weight:700;font-size:13px;">TOTAL</td>
          <td style="padding:9px 10px;color:${WHITE};font-size:12px;"></td>
          <td style="padding:9px 10px;color:${WHITE};font-weight:700;font-size:12px;text-align:center;">${ce.summary.totalBaseHours}h</td>
          <td style="padding:9px 10px;color:${WHITE};font-weight:900;font-size:13px;text-align:center;">${ce.summary.totalAIReducedHours}h</td>
          <td style="padding:9px 10px;color:#CCFFCC;font-weight:700;font-size:12px;text-align:center;">↓${ce.summary.totalHoursSaved}h</td>
          <td style="padding:9px 10px;color:${WHITE};font-weight:900;font-size:14px;text-align:right;">${formatCurrency(ce.summary.totalCost)}</td>
        </tr>
      </tbody>
    </table>
    ${sub('6.3 Resources & Costing')}
    ${tbl(
      ['Resource', 'Rate', 'Total Hours', 'Total Cost', 'Responsibility'],
      ce.rolesRequired.map(r => [
        `<strong>${r.role}</strong>`,
        `<span style="color:${BRAND};font-weight:700">$${r.rate}/hr</span>`,
        `${r.totalHours}h`,
        `<strong>${formatCurrency(r.totalCost)}</strong>`,
        `<span style="font-size:11px">${r.responsibility}</span>`,
      ]),
      ['180px', '90px', '90px', '100px', '']
    )}
    <p style="font-size:11px;color:#888;margin-top:-8px;">Note: Infrastructure costs are variable. All third-party costs borne by the client.</p>
    ${sub('6.4 Payment Structure')}${p(data.methodology.paymentStructure)}`

  const risksSection = `
    ${sec('07', 'Risks & Mitigation')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr>
        ${th('Risk', '')}${th('Likelihood', '100px')}${th('Impact', '100px')}${th('Mitigation', '')}
      </tr></thead>
      <tbody>
        ${data.risks.map((r, i) => `<tr>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:12px;border-bottom:1px solid ${BORDER};vertical-align:top;">${r.risk}</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;border-bottom:1px solid ${BORDER};vertical-align:top;">${riskBadge(r.likelihood)}</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;border-bottom:1px solid ${BORDER};vertical-align:top;">${riskBadge(r.impact)}</td>
          <td style="background:${i % 2 === 1 ? ALT_ROW : WHITE};padding:7px 10px;font-size:12px;border-bottom:1px solid ${BORDER};vertical-align:top;">${r.mitigation}</td>
        </tr>`).join('')}
      </tbody>
    </table>`

  const govSection = `
    ${sec('08', 'Communication & Governance')}
    ${sub('Reporting Cadence')}${ul(data.governance.reportingCadence)}
    ${sub('Change Request Process')}${ul(data.governance.changeRequestProcess)}
    ${sub('Phase Sign-Off')}${p(data.governance.phaseSignOff)}
    ${sub('Escalation Path')}${ul(data.governance.escalationPath)}`

  const assumptionsSection = (data.assumptions?.length || data.openQuestions?.length) ? `
    ${sec('09', 'Assumptions & Open Questions')}
    ${data.assumptions?.length ? `${sub('Assumptions')}${ul(data.assumptions)}` : ''}
    ${data.openQuestions?.length ? `${sub('Open Questions')}${ul(data.openQuestions)}` : ''}` : ''

  const footerSection = `
    <div style="text-align:center;margin-top:48px;padding-top:24px;border-top:3px solid ${BRAND};">
      <p style="font-weight:700;font-size:15px;color:${DARK};">Thank you for the opportunity to propose on ${data.project.name}.</p>
      <p style="color:${BRAND};font-style:italic;margin-top:4px;">${company.tagline}</p>
      <p style="font-size:11px;color:#aaa;margin-top:12px;">${company.name} · ${company.website} · ${company.phone}</p>
    </div>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: ${DARK}; max-width: 960px; margin: 0 auto; padding: 40px; }
    * { box-sizing: border-box; }
    table { page-break-inside: avoid; }
  </style>
</head>
<body>
  ${coverSection}
  ${execSection}
  ${understandingSection}
  ${objectivesSection}
  ${solutionSection}
  ${techSection}
  ${costSection}
  ${risksSection}
  ${govSection}
  ${assumptionsSection}
  ${footerSection}
</body>
</html>`
}
