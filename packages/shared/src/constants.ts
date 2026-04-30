/** Application-wide constants */

export const APP_NAME = 'Gulf Coast Industrial Radar'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Gulf Coast bounding box (rough) */
export const GULF_COAST_BBOX = {
  minLng: -94.5,
  minLat: 28.5,
  maxLng: -88.5,
  maxLat: 31.5,
} as const

/** Default map center (near Baton Rouge) */
export const DEFAULT_MAP_CENTER = {
  lng: -91.15,
  lat: 30.45,
} as const

/** Default map zoom level */
export const DEFAULT_MAP_ZOOM = 8

/** Scoring thresholds */
export const SCORE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
} as const

/** Worker cron schedule (default: every 4 hours) */
export const DEFAULT_CRON_SCHEDULE = '0 */4 * * *'

/** API routes */
export const API_ROUTES = {
  PROJECTS: '/api/projects',
  BRIEFS: '/api/briefs',
  CRON: '/api/cron',
  HEALTH: '/api/health',
} as const
