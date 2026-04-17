import { buildSystemPrompt, tryWithFallbacks } from './ai.js'

export interface GenerateConceptBody {
  requirements: string
  projectInfo: Record<string, string>
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

function buildConceptPrompt(
  requirements: string,
  projectInfo: Record<string, string>,
): string {
  return `Analyze the following project idea and generate a DEEP, COMPREHENSIVE concept document in JSON format.

PROJECT INFO:
- Project Name: ${projectInfo.projectName || 'Untitled Project'}
- Client: ${projectInfo.clientName || 'Client'}

PROJECT REQUIREMENTS / IDEA:
${requirements}

INSTRUCTIONS:
Generate an end-to-end concept document that goes far beyond a surface overview. Cover every dimension a stakeholder would need to evaluate feasibility, business viability, and build approach:

1. Full platform breakdown with per-platform value/benefits and KPIs
2. Detailed user personas with demographics, goals, pain points, preferred channels, and a representative quote
3. User types with full key action lists
4. End-to-end user journeys: each step must include the user action, exact touchpoint/screen, emotional state, and system response — not just a label but a full narrative step
5. Architecture components with technology choices and communication flows
6. Recommended tech stack with alternatives and rationale
7. Complete feature list (15–25 features) prioritised Must Have / Should Have / Nice to Have
8. MONETISATION: business model, all revenue streams (subscriptions, transaction fees, ads, marketplace, licensing, etc.), pricing strategy, ARPU estimate, break-even note
9. COMPETITIVE LANDSCAPE: 3–5 competitors (direct and indirect) with strengths, weaknesses, and our specific edge
10. SUCCESS METRICS: 8–12 measurable KPIs across User Acquisition, Retention, Engagement, Revenue, and Operational categories
11. GO-TO-MARKET: launch strategy, target channels, early adopter profile, phased GTM plan, partnership opportunities
12. Technical insights, risks, open questions, next steps

Return ONLY valid JSON — no markdown fences, no extra text. Use exactly this structure:

{
  "projectName": "string",
  "client": "string",
  "overview": "string (4-5 sentences covering what it is, who it's for, why it matters, and what makes it different)",
  "problemStatement": "string (the specific pain point, who feels it, and the cost of not solving it)",

  "targetPlatforms": [
    {
      "platform": "string (e.g. iOS & Android Mobile App)",
      "type": "mobile|web|backend|desktop|other",
      "rationale": "string (why this platform is essential to the product)",
      "targetUsers": ["string"]
    }
  ],

  "platformBenefits": [
    {
      "platform": "string (must match a targetPlatforms[].platform name)",
      "primaryBeneficiary": "string (e.g. End Users, Business Owners, Admins)",
      "valueProposition": "string (one crisp sentence — what value this platform uniquely delivers)",
      "keyBenefits": ["string (4-6 concrete benefits this platform creates)"],
      "kpis": ["string (2-4 measurable outcomes this platform drives, e.g. 'DAU > 5,000 within 3 months')"]
    }
  ],

  "personas": [
    {
      "name": "string (e.g. 'Sarah — The Busy Professional')",
      "role": "string (e.g. End User, Admin, Business Owner)",
      "demographics": "string (age range, lifestyle context, device preference)",
      "goals": ["string (3-5 things they want to achieve with this product)"],
      "painPoints": ["string (3-5 current frustrations before this product exists)"],
      "preferredChannels": ["string (e.g. Mobile app, Email notifications, WhatsApp)"],
      "quote": "string (a realistic voice-of-customer quote capturing their frustration or desire)"
    }
  ],

  "userTypes": [
    {
      "type": "string (e.g. End User, Admin, Business Owner)",
      "description": "string",
      "primaryPlatform": "string",
      "keyActions": ["string (6-8 primary actions this user type performs in the system)"]
    }
  ],

  "userJourneys": [
    {
      "userType": "string",
      "journey": "string (journey name, e.g. 'First-Time Onboarding', 'Complete a Purchase', 'Manage Monthly Report')",
      "trigger": "string (what event or need initiates this journey, e.g. 'User downloads app after seeing an Instagram ad')",
      "steps": [
        {
          "action": "string (what the user actively does, e.g. 'Taps Sign Up and enters email and password')",
          "touchpoint": "string (exact screen or channel, e.g. 'Mobile App — Welcome / Sign Up Screen')",
          "emotion": "string (user's emotional state at this moment, e.g. 'Curious but slightly cautious')",
          "systemResponse": "string (what the product does in response, e.g. 'Sends OTP verification email within 5 seconds')"
        }
      ],
      "outcome": "string (the user's desired end state after completing this journey)",
      "successIndicator": "string (how the system knows the journey was completed successfully)"
    }
  ],

  "architectureOverview": {
    "description": "string (3-4 sentences on the overall architecture pattern and key design decisions)",
    "components": [
      {
        "name": "string",
        "technology": "string",
        "purpose": "string",
        "communicatesWith": ["string"]
      }
    ],
    "dataFlow": "string (describe the main data flow from user action to persistence to response)"
  },

  "techStack": [
    {
      "layer": "string (e.g. Mobile Frontend, Web Frontend, Backend API, Database, Cache, DevOps, Third-Party Services)",
      "recommended": "string",
      "alternatives": ["string"],
      "rationale": "string"
    }
  ],

  "keyFeatures": [
    {
      "name": "string",
      "description": "string (2-3 sentences on what it does and why it matters)",
      "platforms": ["string"],
      "priority": "Must Have|Should Have|Nice to Have"
    }
  ],

  "monetization": {
    "businessModel": "string (2-3 sentences describing the overall monetisation approach and why it fits this product)",
    "primaryRevenue": "string (the single biggest revenue driver)",
    "streams": [
      {
        "name": "string (e.g. 'Premium Subscription', 'Transaction Commission', 'API Licensing')",
        "model": "string (e.g. 'Monthly SaaS / Freemium', 'Revenue share 2-5%')",
        "description": "string (how this stream works)",
        "targetUser": "string (which user type or persona pays)",
        "revenueRange": "string (realistic pricing or fee, e.g. '$9.99–$49.99/month')",
        "implementationPhase": "string (e.g. 'Phase 1 — MVP', 'Phase 2 — Growth')"
      }
    ],
    "pricingStrategy": "string (e.g. 'Freemium with feature gating on collaboration and exports')",
    "estimatedArpu": "string (realistic average revenue per user, e.g. '$22/month across paid tier')",
    "breakEvenNote": "string (rough scenario, e.g. 'Break-even at ~500 paying users assuming $30 ARPU')"
  },

  "competitiveLandscape": [
    {
      "name": "string (competitor or alternative product name)",
      "type": "direct|indirect|partial",
      "strengths": ["string (2-3 genuine strengths)"],
      "weaknesses": ["string (2-3 genuine weaknesses or gaps)"],
      "ourEdge": "string (specific differentiator this product has over this competitor)"
    }
  ],

  "successMetrics": [
    {
      "category": "string (User Acquisition | Retention | Engagement | Revenue | Operational)",
      "metric": "string (e.g. 'Monthly Active Users', 'Day-30 Retention Rate', 'MRR')",
      "target": "string (e.g. '10,000 MAU', '35% retention', '$15,000 MRR')",
      "timeframe": "string (e.g. 'End of Month 3', 'Post Phase 2 launch')",
      "measurementMethod": "string (e.g. 'Firebase Analytics', 'Stripe Dashboard', 'Custom admin reports')"
    }
  ],

  "goToMarket": {
    "launchStrategy": "string (2-3 sentences on the overall launch approach — soft launch vs public, B2C vs B2B, etc.)",
    "targetChannels": ["string (e.g. App Store / Play Store, LinkedIn Ads, Content Marketing, Partner Referrals)"],
    "earlyAdopterProfile": "string (describe who the first 100 users will be, where to find them, and why they'll care)",
    "phases": [
      {
        "phase": "string (e.g. 'Phase 1 — Private Beta')",
        "activities": ["string (3-5 specific activities in this GTM phase)"],
        "duration": "string",
        "goal": "string (the measurable goal for this GTM phase)"
      }
    ],
    "partnershipOpportunities": ["string (2-4 types of partners or integrations that accelerate distribution)"]
  },

  "ballparkEstimate": {
    "minCost": 0,
    "maxCost": 0,
    "currency": "USD",
    "basis": "string (explain the basis — team size, daily rates, complexity assumptions)",
    "timeline": {
      "min": "string (e.g. '5 months')",
      "max": "string (e.g. '9 months')"
    },
    "phases": [
      {
        "name": "string (e.g. 'Phase 1 — MVP')",
        "duration": "string",
        "costRange": "string (e.g. '$30,000–$50,000')",
        "scope": "string (specific deliverables in this phase)"
      }
    ]
  },

  "technicalInsights": ["string (8-10 key technical considerations, constraints, or architectural recommendations)"],
  "risks": ["string (6-8 specific risks covering technical, business, and execution dimensions)"],
  "openQuestions": ["string (6-8 questions that must be answered before development begins)"],
  "nextSteps": ["string (5-7 concrete next steps in priority order)"]
}

QUALITY RULES:
- userJourneys: provide at least 3 journeys covering key user types (e.g. onboarding, core action, admin task)
- Each journey must have at least 6 detailed steps — be specific about screen names, system behaviour, and emotions
- personas: minimum 2, maximum 4 — make them realistic with real-sounding names and context
- competitiveLandscape: minimum 3 competitors — include both direct and indirect alternatives
- successMetrics: minimum 8 KPIs across at least 4 categories
- goToMarket.phases: minimum 3 GTM phases
- keyFeatures: minimum 15 features
- monetization.streams: minimum 2 revenue streams
- platformBenefits: one entry per platform in targetPlatforms
- Be specific with numbers and ranges everywhere — avoid vague statements`
}

export async function generateConceptFromBody(body: GenerateConceptBody): Promise<{ concept: unknown; provider: string }> {
  const { requirements, projectInfo, companyProfile, anthropicKey, geminiKey, openaiKey } = body

  if (!requirements?.trim()) {
    throw new Error('Requirements are required')
  }
  if (!anthropicKey?.trim() && !geminiKey?.trim() && !openaiKey?.trim() && !process.env.GROQ_API_KEY?.trim()) {
    throw new Error('Please provide at least one API key')
  }

  const systemPrompt = buildSystemPrompt(companyProfile?.name || projectInfo.preparedBy || 'the delivery company')
  const userPrompt = buildConceptPrompt(requirements, projectInfo)

  const { text: rawText, provider } = await tryWithFallbacks(systemPrompt, userPrompt, {
    anthropicKey,
    geminiKey,
    openaiKey,
  })

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')

  return { concept: JSON.parse(jsonMatch[0]), provider }
}
