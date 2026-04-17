export interface EstimateFeature {
  module: string
  feature: string
  description: string
  platform: string
  designHours: number
  frontendHours: number
  backendHours: number
  qaHours: number
  pmHours: number
  totalHours: number
  isSharedBackend: boolean
  sharedNote: string
}

export interface PlatformCostSummary {
  platform: string
  designHours: number
  designCost: number
  frontendHours: number
  frontendCost: number
  backendHours: number
  backendCost: number
  qaHours: number
  qaCost: number
  pmHours: number
  pmCost: number
  devopsHours: number
  devopsCost: number
  totalHours: number
  totalCost: number
}

export interface EstimateData {
  projectName: string
  client: string
  platforms: string[]
  features: EstimateFeature[]
  costingSummary: {
    byPlatform: PlatformCostSummary[]
    grandTotalHours: number
    grandTotalCost: number
    timeline: string
  }
}
