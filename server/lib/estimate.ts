import { buildSystemPrompt, tryWithFallbacks } from './ai.js'

export interface GenerateEstimateBody {
  requirements: string
  projectInfo: Record<string, string>
  teamRates: Record<string, number>
  companyProfile?: {
    id: string
    name: string
    tagline: string
    website: string
    phone: string
    email: string
    brandColor: string
  }
  anthropicKey: string
  geminiKey: string
  openaiKey: string
}

function buildEstimatePrompt(
  requirements: string,
  projectInfo: Record<string, string>,
  teamRates: Record<string, number>,
): string {
  const rates = {
    'Backend Developer': teamRates['Backend Developer'] ?? 20,
    'Frontend Developer': teamRates['Frontend Developer'] ?? 20,
    'UI/UX Designer': teamRates['UI/UX Designer'] ?? 18,
    'QA Engineer': teamRates['QA Engineer'] ?? 15,
    'Project Manager': teamRates['Project Manager'] ?? 25,
    'DevOps Engineer': teamRates['DevOps Engineer'] ?? 20,
  }

  return `Analyze the following project requirements and generate a detailed split estimate in JSON format.

PROJECT INFO:
- Project Name: ${projectInfo.projectName || 'Untitled Project'}
- Client: ${projectInfo.clientName || 'Client'}
- Engagement Type: ${projectInfo.engagementType || 'Fixed-Price'}

RESOURCE RATES ($/hr):
${Object.entries(rates).map(([k, v]) => `- ${k}: $${v}`).join('\n')}

PROJECT REQUIREMENTS:
${requirements}

INSTRUCTIONS:
1. First, identify all platforms needed for this project (e.g. Mobile App (iOS & Android), Admin Panel, Backend API, UI/UX Design, Web App, etc.)
2. For each platform, list all features/modules with hour estimates per role.
3. BACKEND SHARING RULE: If a feature has backend work that is shared across platforms:
   - The FIRST platform to use it gets FULL backend development hours
   - Subsequent platforms get only setup/integration hours (typically 10-25% of original backend hours)
   - Mark isSharedBackend: true for reused backend features and explain in sharedNote
4. Hour allocation:
   - designHours: UI/UX design work (0 for backend-only or API-only items)
   - frontendHours: Frontend/mobile implementation (0 for backend-only)
   - backendHours: Backend/API development (full for first occurrence, setup-only for shared)
   - qaHours: Testing per feature
   - pmHours: Project management overhead (~10% of total feature hours)
5. Be comprehensive: list individual features (not just modules), 5-15 features per platform
6. Cost per role = hours * rate

Return ONLY this JSON structure (no markdown, no extra text):

{
  "projectName": "string",
  "client": "string",
  "platforms": ["string"],
  "features": [
    {
      "module": "string (e.g. Authentication, Dashboard, User Management)",
      "feature": "string (specific feature name)",
      "description": "string (brief description of what this feature does)",
      "platform": "string (which platform this row belongs to)",
      "designHours": 0,
      "frontendHours": 0,
      "backendHours": 0,
      "qaHours": 0,
      "pmHours": 0,
      "totalHours": 0,
      "isSharedBackend": false,
      "sharedNote": "string (empty if not shared, else explain e.g. 'Backend shared with Mobile App — setup/integration only')"
    }
  ],
  "costingSummary": {
    "byPlatform": [
      {
        "platform": "string",
        "designHours": 0,
        "designCost": 0,
        "frontendHours": 0,
        "frontendCost": 0,
        "backendHours": 0,
        "backendCost": 0,
        "qaHours": 0,
        "qaCost": 0,
        "pmHours": 0,
        "pmCost": 0,
        "devopsHours": 0,
        "devopsCost": 0,
        "totalHours": 0,
        "totalCost": 0
      }
    ],
    "grandTotalHours": 0,
    "grandTotalCost": 0,
    "timeline": "string (e.g. '14–18 weeks')"
  }
}

IMPORTANT:
- totalHours per feature = designHours + frontendHours + backendHours + qaHours + pmHours
- costingSummary.byPlatform must have one entry per platform
- Each platform cost = sum of (hours * respective rate) for all features in that platform
- grandTotalCost must equal sum of all platform totalCost values
- Timeline should reflect parallel tracks (e.g. Mobile + Admin can develop simultaneously)`
}

export async function generateEstimateFromBody(body: GenerateEstimateBody): Promise<{ estimate: unknown; provider: string }> {
  const { requirements, projectInfo, teamRates, companyProfile, anthropicKey, geminiKey, openaiKey } = body

  if (!requirements?.trim()) {
    throw new Error('Requirements are required')
  }
  if (!anthropicKey?.trim() && !geminiKey?.trim() && !openaiKey?.trim()) {
    throw new Error('Please provide at least one API key')
  }

  const systemPrompt = buildSystemPrompt(companyProfile?.name || projectInfo.preparedBy || 'the delivery company')
  const userPrompt = buildEstimatePrompt(requirements, projectInfo, teamRates ?? {})

  const { text: rawText, provider } = await tryWithFallbacks(systemPrompt, userPrompt, {
    anthropicKey,
    geminiKey,
    openaiKey,
  })

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')

  return { estimate: JSON.parse(jsonMatch[0]), provider }
}
