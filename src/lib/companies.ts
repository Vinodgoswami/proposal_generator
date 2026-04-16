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
