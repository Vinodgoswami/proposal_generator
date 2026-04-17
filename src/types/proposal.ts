export interface ProposalProject {
  name: string
  client: string
  subtitle: string
  engagementType: string
  version: string
}

export interface PhaseBreakdown {
  name: string
  cost: number
  duration: string
  description: string
}

export interface ExecutiveSummary {
  text: string
  totalCost: number
  totalTimeline: string
  phaseBreakdown: PhaseBreakdown[]
}

export interface UserType {
  type: string
  description: string
}

export interface ProjectUnderstanding {
  whatItIs: string
  problemSolving: string
  keyFeatures: string[]
  userTypes: UserType[]
}

export interface SuccessCriteria {
  metric: string
  target: string
  validationMethod: string
}

export interface Objectives {
  delivery: string[]
  successCriteria: SuccessCriteria[]
}

export interface ArchitecturePillar {
  name: string
  technology: string
  description: string
}

export interface ProposedSolution {
  overview: string
  architecturePillars: ArchitecturePillar[]
}

export interface TechStackRow {
  layer: string
  technology: string
  justification: string
}

export interface CostModule {
  phase: string
  name: string
  features: string[]
  baseHours: number
  aiReducedHours: number
  hoursSaved: number
  primaryRole: string
  cost: number
  notes: string
}

export interface RoleRequired {
  role: string
  rate: number
  totalHours: number
  totalCost: number
  responsibility: string
  availability: string
}

export interface CostSummary {
  totalBaseHours: number
  totalAIReducedHours: number
  totalHoursSaved: number
  totalCost: number
  aiSavingsAmount: number
}

export interface CostEstimation {
  modules: CostModule[]
  rolesRequired: RoleRequired[]
  summary: CostSummary
}

export interface DeliveryTrack {
  track: string
  focus: string
}

export interface Methodology {
  approach: string
  sprintLength: string
  deliveryTracks: DeliveryTrack[]
  paymentStructure: string
}

export interface Risk {
  risk: string
  likelihood: 'Low' | 'Medium' | 'High'
  impact: 'Low' | 'Medium' | 'High'
  mitigation: string
}

export interface Governance {
  reportingCadence: string[]
  changeRequestProcess: string[]
  phaseSignOff: string
  escalationPath: string[]
}

export interface ProposalData {
  project: ProposalProject
  executiveSummary: ExecutiveSummary
  projectUnderstanding: ProjectUnderstanding
  objectives: Objectives
  proposedSolution: ProposedSolution
  techStack: TechStackRow[]
  costEstimation: CostEstimation
  methodology: Methodology
  risks: Risk[]
  governance: Governance
  assumptions: string[]
  openQuestions: string[]
  /** Section keys hidden/deleted in edit mode */
  hiddenSections?: string[]
}

export interface AIConfig {
  'Setup & Architecture': number
  'Frontend Development': number
  'Backend Development': number
  'API Integration': number
  'UI/UX Design': number
  'QA & Testing': number
  'DevOps & Infra': number
  'Documentation': number
}

export interface ProjectInfo {
  projectName: string
  clientName: string
  engagementType: string
  preparedBy: string
  version: string
  companySnapshot?: CompanyConfig
}

export interface CompanyConfig {
  id: string
  name: string
  tagline: string
  website: string
  phone: string
  email: string
  /** hex without # — used in DOCX/HTML exporters */
  brandHex: string
  /** full CSS color — used in React styles */
  brandColor: string
  brand50: string
  brand100: string
  brand200: string
  brand700: string
}

export interface TeamRates {
  'Backend Developer': number
  'Frontend Developer': number
  'UI/UX Designer': number
  'QA Engineer': number
  'Project Manager': number
  'DevOps Engineer': number
}

export interface SavedProposal {
  id: string
  title: string
  description: string
  requirementsHash: string
  proposalData: ProposalData
  projectInfo: ProjectInfo
  companyId: string
  totalCost: number
  timeline: string
  createdAt: string
  updatedAt: string
}
