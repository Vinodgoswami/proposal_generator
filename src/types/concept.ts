export interface ConceptPlatform {
  platform: string
  type: 'mobile' | 'web' | 'backend' | 'desktop' | 'other'
  rationale: string
  targetUsers: string[]
}

// ── NEW: Per-platform value breakdown ─────────────────────────────────────────

export interface ConceptPlatformBenefit {
  platform: string
  primaryBeneficiary: string    // e.g. "End Users", "Admins", "Business Owner"
  valueProposition: string      // one-line value statement
  keyBenefits: string[]         // 3-5 concrete benefits this platform delivers
  kpis: string[]                // measurable outcomes driven by this platform
}

// ── NEW: Detailed user personas ───────────────────────────────────────────────

export interface ConceptPersona {
  name: string                  // e.g. "Sarah — The Busy Professional"
  role: string                  // maps to a userType
  demographics: string          // age range, lifestyle, device preference
  goals: string[]               // what they want to achieve
  painPoints: string[]          // current frustrations before this product
  preferredChannels: string[]   // e.g. ["Mobile app", "Email", "Push notifications"]
  quote: string                 // representative voice-of-customer quote
}

// ── User types (unchanged) ────────────────────────────────────────────────────

export interface ConceptUserType {
  type: string
  description: string
  primaryPlatform: string
  keyActions: string[]
}

// ── NEW: Rich journey steps ───────────────────────────────────────────────────

export interface ConceptJourneyStep {
  action: string                // what the user does
  touchpoint: string            // where this happens (screen / channel)
  emotion: string               // how the user feels at this moment
  systemResponse: string        // what the product does in response
}

export interface ConceptUserJourney {
  userType: string
  journey: string               // journey name, e.g. "First Purchase"
  trigger: string               // what initiates this journey
  // steps can be either legacy string[] (old records) or new ConceptJourneyStep[]
  steps: string[] | ConceptJourneyStep[]
  outcome: string               // desired end state for the user
  successIndicator: string      // how we know the journey succeeded
}

// ── Architecture (unchanged) ──────────────────────────────────────────────────

export interface ConceptArchitectureComponent {
  name: string
  technology: string
  purpose: string
  communicatesWith: string[]
}

export interface ConceptTechStack {
  layer: string
  recommended: string
  alternatives: string[]
  rationale: string
}

// ── Features (unchanged) ──────────────────────────────────────────────────────

export interface ConceptFeature {
  name: string
  description: string
  platforms: string[]
  priority: 'Must Have' | 'Should Have' | 'Nice to Have'
}

// ── NEW: Monetization ─────────────────────────────────────────────────────────

export interface ConceptMonetizationStream {
  name: string                  // e.g. "Premium Subscription"
  model: string                 // e.g. "Monthly SaaS / Freemium"
  description: string
  targetUser: string            // which persona/user type this targets
  revenueRange: string          // e.g. "$9.99–$49.99/month per user"
  implementationPhase: string   // e.g. "Phase 1 — MVP"
}

export interface ConceptMonetization {
  businessModel: string         // overall model description (2-3 sentences)
  primaryRevenue: string        // single biggest revenue driver
  streams: ConceptMonetizationStream[]
  pricingStrategy: string       // e.g. "Land & expand with freemium tier"
  estimatedArpu: string         // average revenue per user
  breakEvenNote: string         // rough scenario for break-even
}

// ── NEW: Competitive landscape ────────────────────────────────────────────────

export interface ConceptCompetitor {
  name: string
  type: 'direct' | 'indirect' | 'partial'
  strengths: string[]
  weaknesses: string[]
  ourEdge: string               // our key differentiator vs this competitor
}

// ── NEW: Success metrics & KPIs ───────────────────────────────────────────────

export interface ConceptSuccessMetric {
  category: string              // e.g. "User Acquisition", "Retention", "Revenue"
  metric: string                // e.g. "Monthly Active Users"
  target: string                // e.g. "10,000 MAU by end of Month 6"
  timeframe: string
  measurementMethod: string     // e.g. "Analytics dashboard, Mixpanel"
}

// ── NEW: Go-to-market strategy ────────────────────────────────────────────────

export interface ConceptGoToMarketPhase {
  phase: string                 // e.g. "Phase 1 — Soft Launch"
  activities: string[]
  duration: string
  goal: string
}

export interface ConceptGoToMarket {
  launchStrategy: string        // overall approach (2-3 sentences)
  targetChannels: string[]      // e.g. ["App Store", "LinkedIn Ads", "Partner network"]
  earlyAdopterProfile: string   // who the first users will be and why
  phases: ConceptGoToMarketPhase[]
  partnershipOpportunities: string[]
}

// ── Estimate phases (unchanged) ───────────────────────────────────────────────

export interface ConceptPhase {
  name: string
  duration: string
  costRange: string
  scope: string
}

// ── Main document ─────────────────────────────────────────────────────────────

export interface ConceptData {
  projectName: string
  client: string
  overview: string
  problemStatement: string

  // Platforms
  targetPlatforms: ConceptPlatform[]
  platformBenefits: ConceptPlatformBenefit[]   // NEW

  // Users
  personas: ConceptPersona[]                   // NEW
  userTypes: ConceptUserType[]
  userJourneys: ConceptUserJourney[]           // ENHANCED with rich steps

  // System
  architectureOverview: {
    description: string
    components: ConceptArchitectureComponent[]
    dataFlow: string
  }
  techStack: ConceptTechStack[]

  // Product
  keyFeatures: ConceptFeature[]

  // Business
  monetization: ConceptMonetization            // NEW
  competitiveLandscape: ConceptCompetitor[]    // NEW
  successMetrics: ConceptSuccessMetric[]       // NEW
  goToMarket: ConceptGoToMarket               // NEW

  // Estimate
  ballparkEstimate: {
    minCost: number
    maxCost: number
    currency: string
    basis: string
    timeline: {
      min: string
      max: string
    }
    phases: ConceptPhase[]
  }

  // Closing
  technicalInsights: string[]
  risks: string[]
  openQuestions: string[]
  nextSteps: string[]
}
