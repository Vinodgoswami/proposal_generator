const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface GenerateProposalBody {
  requirements: string
  projectInfo: Record<string, string>
  aiConfig: Record<string, number>
  teamRates: Record<string, number>
  anthropicKey: string
  geminiKey: string
  openaiKey: string
}

export function buildSystemPrompt(): string {
  return `You are a Senior Technical Project Manager at ChicMic Studios with 12+ years of experience delivering scalable web, mobile, AI, and blockchain products. You write high-quality, client-ready technical proposals.

You will analyze project requirements and return ONLY valid JSON (no markdown, no explanation) matching the exact schema provided. Be thorough, consultative, and realistic.

Key rules:
- MVP-first thinking: phase delivery over monolithic commitments
- Auto-detect which team roles are needed based on the project type
- Estimate hours per module based on complexity (not per-feature, per module/component)
- Split hours into: Without AI Tools (base) vs With AI Tools (reduced by AI efficiency factor per category)
- Be consultative: identify risks, gaps, and alternatives
- Never overpromise. State assumptions clearly.
- Use ranges for timelines: "6–8 weeks" not "7 weeks"
- Use ONLY the resource rates provided in the user prompt for all cost calculations`
}

export function buildUserPrompt(
  requirements: string,
  projectInfo: Record<string, string>,
  aiConfig: Record<string, number>,
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

  return `Analyze the following project requirements and generate a comprehensive technical proposal JSON.

PROJECT INFO:
- Project Name: ${projectInfo.projectName || 'Untitled Project'}
- Client/Prepared For: ${projectInfo.clientName || 'Client'}
- Engagement Type: ${projectInfo.engagementType || 'Fixed-Price · Phased Delivery'}

AI EFFICIENCY FACTORS (% of hours reduced by AI assistance per category):
${Object.entries(aiConfig).map(([k, v]) => `- ${k}: ${v}%`).join('\n')}

RESOURCE RATES ($/hr) — use these exact rates in all cost calculations:
${Object.entries(rates).map(([k, v]) => `- ${k}: $${v}`).join('\n')}

PROJECT REQUIREMENTS:
${requirements}

Return ONLY this JSON structure (no markdown fences, no extra text):

{
  "project": {
    "name": "string",
    "client": "string",
    "subtitle": "string (e.g. 'Mobile App & Backend Platform')",
    "engagementType": "string",
    "version": "1.0"
  },
  "executiveSummary": {
    "text": "2-3 paragraph summary demonstrating deep understanding of the project",
    "totalCost": 0,
    "totalTimeline": "string (e.g. '12–16 Weeks')",
    "phaseBreakdown": [
      { "name": "string", "cost": 0, "duration": "string", "description": "string" }
    ]
  },
  "projectUnderstanding": {
    "whatItIs": "string - comprehensive description",
    "problemSolving": "string - what problem this solves",
    "keyFeatures": ["string"],
    "userTypes": [
      { "type": "string", "description": "string" }
    ]
  },
  "objectives": {
    "delivery": ["string"],
    "successCriteria": [
      { "metric": "string", "target": "string", "validationMethod": "string" }
    ]
  },
  "proposedSolution": {
    "overview": "string",
    "architecturePillars": [
      { "name": "string", "technology": "string", "description": "string" }
    ]
  },
  "techStack": [
    { "layer": "string", "technology": "string", "justification": "string" }
  ],
  "costEstimation": {
    "modules": [
      {
        "phase": "string (e.g. 'Phase 1' or 'Module')",
        "name": "string",
        "features": ["string"],
        "baseHours": 0,
        "aiReducedHours": 0,
        "hoursSaved": 0,
        "primaryRole": "string (Backend Developer | Frontend Developer | UI/UX Designer | QA Engineer | DevOps Engineer)",
        "cost": 0,
        "notes": "string"
      }
    ],
    "rolesRequired": [
      {
        "role": "string",
        "rate": 0,
        "totalHours": 0,
        "totalCost": 0,
        "responsibility": "string",
        "availability": "string"
      }
    ],
    "summary": {
      "totalBaseHours": 0,
      "totalAIReducedHours": 0,
      "totalHoursSaved": 0,
      "totalCost": 0,
      "aiSavingsAmount": 0
    }
  },
  "methodology": {
    "approach": "string",
    "sprintLength": "string",
    "deliveryTracks": [
      { "track": "string", "focus": "string" }
    ],
    "paymentStructure": "string"
  },
  "risks": [
    { "risk": "string", "likelihood": "Low|Medium|High", "impact": "Low|Medium|High", "mitigation": "string" }
  ],
  "governance": {
    "reportingCadence": ["string"],
    "changeRequestProcess": ["string"],
    "phaseSignOff": "string",
    "escalationPath": ["string"]
  },
  "assumptions": ["string"],
  "openQuestions": ["string"]
}

IMPORTANT:
- Modules should reflect the ACTUAL project scope from the requirements
- rolesRequired should only include roles actually needed for this specific project
- Cost = aiReducedHours * rate for the primary role
- aiReducedHours = baseHours * (1 - aiEfficiencyFactor/100) for the relevant category
- Be thorough: 8-15 modules minimum for any non-trivial project
- totalCost in executiveSummary must match sum of all module costs`
}

async function callAnthropic(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 8000, temperature: 0.3 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
  return data.candidates[0]?.content?.parts?.[0]?.text ?? ''
}

async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 8000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content ?? ''
}

async function tryWithFallbacks(
  systemPrompt: string,
  userPrompt: string,
  keys: { anthropicKey: string; geminiKey: string; openaiKey: string },
): Promise<{ text: string; provider: string }> {
  const { anthropicKey, geminiKey, openaiKey } = keys

  if (anthropicKey?.trim()) {
    try {
      const text = await callAnthropic(systemPrompt, userPrompt, anthropicKey)
      return { text, provider: 'anthropic' }
    } catch (error) {
      console.warn('Anthropic failed:', (error as Error).message)
    }
  }

  if (geminiKey?.trim()) {
    try {
      const text = await callGemini(systemPrompt, userPrompt, geminiKey)
      return { text, provider: 'gemini' }
    } catch (error) {
      console.warn('Gemini failed:', (error as Error).message)
    }
  }

  if (openaiKey?.trim()) {
    try {
      const text = await callOpenAI(systemPrompt, userPrompt, openaiKey)
      return { text, provider: 'openai' }
    } catch (error) {
      console.warn('OpenAI failed:', (error as Error).message)
    }
  }

  throw new Error('All AI providers failed or no API keys provided. Please check your keys and try again.')
}

export async function generateProposalFromBody(body: GenerateProposalBody): Promise<{ proposal: unknown; provider: string }> {
  const { requirements, projectInfo, aiConfig, teamRates, anthropicKey, geminiKey, openaiKey } = body

  if (!requirements?.trim()) {
    throw new Error('Requirements are required')
  }

  if (!anthropicKey?.trim() && !geminiKey?.trim() && !openaiKey?.trim()) {
    throw new Error('Please provide at least one API key (Anthropic, Gemini, or OpenAI)')
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(requirements, projectInfo, aiConfig, teamRates ?? {})
  const { text: rawText, provider } = await tryWithFallbacks(systemPrompt, userPrompt, {
    anthropicKey,
    geminiKey,
    openaiKey,
  })

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON')
  }

  return {
    proposal: JSON.parse(jsonMatch[0]),
    provider,
  }
}
