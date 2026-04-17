import type { CompanyConfig } from '@/types/proposal'

export const COMPANIES: CompanyConfig[] = [
  {
    id: 'chicmic',
    name: 'ChicMic Studios',
    tagline: 'Building Tomorrow\'s Products Today',
    website: 'www.chicmicstudios.in',
    phone: '+91 95014 23775',
    email: 'hello@chicmicstudios.in',
    brandHex: 'E86500',
    brandColor: '#E86500',
    brand50: '#FFF8F3',
    brand100: '#FFEDD5',
    brand200: '#FED7AA',
    brand700: '#C2440D',
  },
  {
    id: 'techfyte',
    name: 'Techfyte',
    tagline: 'Engineering the Future',
    website: 'www.techfyte.com',
    phone: '+91 98765 43210',
    email: 'hello@techfyte.com',
    // Purple gradient from logo: bright purple #A020F0 → dark indigo #3B1A7A
    // Mid-point dominant color used as brand
    brandHex: '8B30C9',
    brandColor: '#8B30C9',
    brand50: '#FAF5FF',
    brand100: '#F3E8FF',
    brand200: '#E9D5FF',
    brand700: '#6D28D9',
  },
]

export const DEFAULT_COMPANY = COMPANIES[0]

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function normalizeHex(hex: string): string {
  const cleaned = hex.replace(/[^0-9a-f]/gi, '').slice(0, 6)
  if (cleaned.length === 3) return cleaned.split('').map(char => char + char).join('').toUpperCase()
  return cleaned.padEnd(6, '0').toUpperCase()
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex)
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b].map(channel => clampChannel(channel).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function mixWithWhite(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `#${rgbToHex(
    r + (255 - r) * ratio,
    g + (255 - g) * ratio,
    b + (255 - b) * ratio,
  )}`
}

function mixWithBlack(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `#${rgbToHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio))}`
}

export function createCompanyConfig(base: {
  id: string
  name: string
  tagline?: string
  website?: string
  phone?: string
  email?: string
  brandColor?: string
}): CompanyConfig {
  const brandColor = base.brandColor?.trim().startsWith('#')
    ? base.brandColor.trim()
    : `#${normalizeHex(base.brandColor?.trim() || DEFAULT_COMPANY.brandHex)}`
  const brandHex = normalizeHex(brandColor)

  return {
    id: base.id,
    name: base.name.trim() || 'Custom Company',
    tagline: base.tagline?.trim() || 'Tailored proposal delivery',
    website: base.website?.trim() || 'www.example.com',
    phone: base.phone?.trim() || '+00 00000 00000',
    email: base.email?.trim() || 'hello@example.com',
    brandHex,
    brandColor,
    brand50: mixWithWhite(brandHex, 0.93),
    brand100: mixWithWhite(brandHex, 0.84),
    brand200: mixWithWhite(brandHex, 0.72),
    brand700: mixWithBlack(brandHex, 0.22),
  }
}

export function resolveCompanyConfig(companyId?: string, snapshot?: CompanyConfig | null): CompanyConfig {
  if (snapshot?.name?.trim()) return snapshot
  return COMPANIES.find(company => company.id === companyId) ?? DEFAULT_COMPANY
}
