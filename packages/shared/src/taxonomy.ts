/**
 * Signal taxonomy for Gulf Coast Industrial Radar
 * Defines signal types, severity levels, and industry classifications.
 */

export type SignalType =
  | 'PERMIT'
  | 'FILING'
  | 'PARCEL'
  | 'REGULATORY'
  | 'PROCUREMENT'
  | 'BOND'
  | 'CORPORATE'
  | 'MEDIA'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ProjectStatus = 'WATCHING' | 'ACTIVE' | 'CONFIRMED' | 'ARCHIVED'

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  PERMIT: 'Permit',
  FILING: 'Filing',
  PARCEL: 'Parcel Transaction',
  REGULATORY: 'Regulatory',
  PROCUREMENT: 'Procurement',
  BOND: 'Municipal Bond',
  CORPORATE: 'Corporate Filing',
  MEDIA: 'Media / PR',
}

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  LOW: '#6b7280',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#7c3aed',
}

export const INDUSTRY_NAICS: Record<string, string> = {
  'LNG Export': '493190',
  Petrochemical: '325110',
  Hydrogen: '325120',
  Chemicals: '325180',
  Plastics: '326100',
  Steel: '331110',
  Bioenergy: '325193',
  Technology: '518210',
  Energy: '211120',
}

/** Gulf Coast industrial corridors */
export const INDUSTRIAL_CORRIDORS = [
  {
    id: 'mississippi-river',
    name: 'Mississippi River Corridor',
    description: 'Baton Rouge to New Orleans industrial corridor',
    parishes: ['Ascension', 'St. James', 'Iberville', 'St. Charles', 'Jefferson', 'Orleans'],
  },
  {
    id: 'lake-charles',
    name: 'Lake Charles / Calcasieu',
    description: 'Southwest Louisiana LNG and petrochemical hub',
    parishes: ['Calcasieu', 'Cameron', 'Jefferson Davis'],
  },
  {
    id: 'plaquemines',
    name: 'Lower Mississippi / Plaquemines',
    description: 'Deep-water port and LNG export zone',
    parishes: ['Plaquemines', 'St. Bernard'],
  },
] as const
