# ProposalBuilder — Project Graph & Phase Tracker

> Last updated: 2026-04-17 | Current branch: `staging` | Phase: **1 Complete → 2 Planning**

---

## Project Overview

```
ProposalBuilder
├── Purpose:  AI-powered technical proposal generator for dev/consulting agencies
├── Stack:    React 18 + TypeScript + Express + Tailwind + Radix UI
├── AI:       Anthropic Claude → Gemini → OpenAI (fallback chain)
├── Storage:  File-based JSON (proposals.json) → Supabase (planned)
└── Deploy:   Netlify (functions stubbed)
```

---

## Architecture Map

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vite/React)                  │
│                                                             │
│  App.tsx ──── views: input → generating → preview ──────── │
│     │                          → history → share           │
│     │                                                       │
│     ├── components/                                         │
│     │   ├── FileUpload.tsx        (drag-drop, PDF/DOCX/TXT) │
│     │   ├── ProposalPreview.tsx   (10 sections, edit mode)  │
│     │   ├── HistoryPage.tsx       (paginated, CRUD)         │
│     │   └── AIConfigPanel.tsx     (8-category sliders)      │
│     │                                                       │
│     └── lib/                                                │
│         ├── proposalApi.ts        (API client + hash dedup) │
│         ├── companies.ts          (brand color system)      │
│         ├── fileParser.ts         (PDF client, DOCX server) │
│         ├── docxExporter.ts       (DOCX generation)         │
│         ├── htmlExporter.ts       (→ Google Docs)           │
│         └── localProposalStore.ts (local cache)             │
│                                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │ Vite proxy /api → :3001
┌─────────────────▼───────────────────────────────────────────┐
│                    BACKEND (Express :3001)                   │
│                                                             │
│  server/index.ts                                            │
│     │                                                       │
│     ├── routes/ai.ts         POST /api/generate             │
│     ├── routes/proposals.ts  GET|POST|PUT|DELETE /api/proposals│
│     ├── routes/parse.ts      POST /api/parse                │
│     └── routes/googleDocs.ts /api/google/* (OAuth2)         │
│                                                             │
│  server/lib/                                                │
│     ├── ai.ts               (prompt builder + AI calls)     │
│     ├── proposalStore.ts    (file-based JSON CRUD)          │
│     ├── googleDocs.ts       (Docs API integration)          │
│     └── googleAuthStore.ts  (OAuth session mgmt)            │
│                                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                       DATA LAYER                            │
│                                                             │
│  proposals.json            ← Active file-based store        │
│  supabase/schema.sql       ← Prepared (not yet migrated)    │
│    ├── proposals           (UUID, JSONB proposal_data)      │
│    └── google_auth_sessions                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Proposal Data Model

```
ProposalData
├── project              (name, client, subtitle, engagementType)
├── executiveSummary     (text, totalCost, timeline, phaseBreakdown[])
├── projectUnderstanding (description, problemSolving, features[], userTypes[])
├── objectives           (deliveryItems[], successCriteria[])
├── proposedSolution     (overview, architecturePillars[])
├── techStack            (rows[]: layer, technology, justification)
├── costEstimation       (modules[], rolesRequired[], summary)
├── methodology          (approach, sprintLength, deliveryTracks[], paymentStructure)
├── risks                (risks[]: description, likelihood, impact, mitigation)
├── governance           (reportingCadence, changeProcess, signOff, escalation)
├── assumptions          (string[])
├── openQuestions        (string[])
└── hiddenSections       (string[])
```

---

## AI Generation Flow

```
User Input
    │
    ├── Requirements (files + text)
    ├── Project info (name, client, type)
    ├── Company branding (colors, contact)
    ├── AI efficiency % (8 categories)
    └── Team rates (6 roles × $/hr)
         │
         ▼
    Hash(requirements + name + scope)
         │
    ┌────▼─────────────────────┐
    │  Cache hit? → Return     │  (proposals.json lookup)
    └────┬─────────────────────┘
         │ Cache miss
         ▼
    Anthropic Claude ──fail──► Google Gemini ──fail──► OpenAI GPT-4o
         │
         ▼
    JSON ProposalData (structured, validated)
         │
         ▼
    Save to proposals.json + Return to frontend
```

---

## Export Pipeline

```
ProposalData
    ├── DOCX Export ────────► docxExporter.ts → FileSaver download
    ├── Google Docs ────────► htmlExporter.ts → OAuth2 → Docs API → URL
    └── Share Link  ────────► /share/:uuid → read-only ProposalPreview
```

---

## Phase Tracker

### ✅ Phase 1 — Core MVP (COMPLETE)

| Feature | Status | Key File |
|---|---|---|
| Multi-file upload (PDF, DOCX, TXT) | ✅ Done | `FileUpload.tsx`, `fileParser.ts` |
| Project metadata input | ✅ Done | `App.tsx` |
| Custom company branding + colors | ✅ Done | `companies.ts`, CSS vars |
| Team rate customization | ✅ Done | `App.tsx` |
| AI efficiency sliders (8 categories) | ✅ Done | `AIConfigPanel.tsx` |
| AI proposal generation (3-provider fallback) | ✅ Done | `server/lib/ai.ts` |
| Hash-based deduplication | ✅ Done | `proposalApi.ts` |
| 10-section proposal output | ✅ Done | `ProposalPreview.tsx` |
| Inline edit mode | ✅ Done | `ProposalPreview.tsx` (EText/EArea/EList/ENum) |
| DOCX export with branding | ✅ Done | `docxExporter.ts` |
| Google Docs export (OAuth2) | ✅ Done | `server/routes/googleDocs.ts` |
| Share links (UUID, read-only) | ✅ Done | `App.tsx`, `server/routes/proposals.ts` |
| Proposal history (paginated) | ✅ Done | `HistoryPage.tsx` |
| Delete + inline edit from history | ✅ Done | `HistoryPage.tsx` |
| Progress messaging (8 steps) | ✅ Done | `App.tsx` |

---

### 🔲 Phase 2 — Persistence & Auth (PLANNED)

| Feature | Priority | Notes |
|---|---|---|
| Supabase DB migration | HIGH | `supabase/schema.sql` ready — switch `proposalStore.ts` |
| User authentication | HIGH | No login yet; Google OAuth base exists |
| Multi-company management | MED | Currently hardcoded to 2 companies |
| Template library | MED | Save/reuse proposal section templates |
| Proposal version history | MED | Track edits over time |

---

### 🔲 Phase 3 — Collaboration & Integrations (FUTURE)

| Feature | Priority | Notes |
|---|---|---|
| Multi-user editing | MED | Requires auth + Supabase first |
| Comments / feedback on proposals | MED | Section-level annotations |
| Approval workflows | LOW | Status: Draft → Review → Approved |
| Slack notifications | LOW | On proposal create/share |
| CRM sync (HubSpot, Salesforce) | LOW | Export proposal data to deals |
| Calendar integration | LOW | Sync timeline milestones |

---

### 🔲 Phase 4 — Analytics & Intelligence (FUTURE)

| Feature | Priority | Notes |
|---|---|---|
| Proposal win/loss tracking | MED | Tag outcomes per proposal |
| Cost estimation accuracy metrics | MED | Actual vs estimated comparison |
| AI model fine-tuning per industry | LOW | Custom prompts per sector |
| A/B proposal style testing | LOW | Compare conversion by style |
| Team utilization reports | LOW | Aggregate hours across proposals |

---

## Git History Snapshot (as of 2026-04-17)

```
9865f0a  shareable link issue (bug fix)
464d58f  History Issue (bug fix)
6159683  Other company proposal (feature)
251db06  Phase 1 Completed ← MILESTONE
866e460  fix: combined text + document
7dd916e  new changes
d772b40  initial build
```

---

## Known Tech Debt / Migration Path

| Item | Current | Target |
|---|---|---|
| Data store | `proposals.json` flat file | Supabase PostgreSQL |
| State management | 30+ useState in App.tsx | Consider Zustand or split into contexts |
| Backend hosting | Local Express :3001 | Netlify Functions (stubs exist) |
| Auth | None (API keys per session) | Supabase Auth or NextAuth |

---

## Deployment Config

```
Netlify:
  build:    npm run build  →  dist/
  redirects: /api/* → /.netlify/functions/*
             /share/* → /index.html (SPA)
             /* → /index.html (SPA)

Dev:
  client:  http://localhost:5173 (Vite)
  server:  http://localhost:3001 (Express)
  proxy:   /api → :3001 (via vite.config.ts)
```
