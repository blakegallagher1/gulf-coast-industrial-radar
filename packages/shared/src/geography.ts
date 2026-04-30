/** Geographic utility types for Gulf Coast Industrial Radar */

export interface LatLng {
  lat: number
  lng: number
}

export interface BoundingBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

/** Louisiana parishes with approximate centroids */
export const LA_PARISHES: Record<string, LatLng> = {
  Ascension: { lat: 30.19, lng: -90.95 },
  'Assumption': { lat: 29.93, lng: -91.04 },
  'Avoyelles': { lat: 31.08, lng: -91.97 },
  'Beauregard': { lat: 30.67, lng: -93.35 },
  'Bienville': { lat: 32.35, lng: -93.08 },
  'Bossier': { lat: 32.69, lng: -93.63 },
  'Caddo': { lat: 32.58, lng: -93.88 },
  'Calcasieu': { lat: 30.22, lng: -93.35 },
  'Caldwell': { lat: 32.07, lng: -92.12 },
  'Cameron': { lat: 29.79, lng: -93.08 },
  'Catahoula': { lat: 31.67, lng: -91.84 },
  'Claiborne': { lat: 32.84, lng: -92.99 },
  'Concordia': { lat: 31.46, lng: -91.64 },
  "De Soto": { lat: 32.06, lng: -93.72 },
  'East Baton Rouge': { lat: 30.44, lng: -91.08 },
  'East Carroll': { lat: 32.78, lng: -91.22 },
  'East Feliciana': { lat: 30.85, lng: -90.74 },
  'Evangeline': { lat: 30.75, lng: -92.41 },
  'Franklin': { lat: 32.14, lng: -91.67 },
  'Grant': { lat: 31.67, lng: -92.55 },
  'Iberia': { lat: 29.97, lng: -91.83 },
  'Iberville': { lat: 30.22, lng: -91.35 },
  'Jackson': { lat: 32.29, lng: -92.56 },
  'Jefferson': { lat: 29.83, lng: -90.1 },
  'Jefferson Davis': { lat: 30.28, lng: -92.82 },
  'Lafayette': { lat: 30.22, lng: -92.08 },
  'Lafourche': { lat: 29.5, lng: -90.44 },
  'La Salle': { lat: 31.68, lng: -92.16 },
  'Lincoln': { lat: 32.61, lng: -92.66 },
  'Livingston': { lat: 30.5, lng: -90.73 },
  'Madison': { lat: 32.35, lng: -91.23 },
  'Morehouse': { lat: 32.79, lng: -91.78 },
  'Natchitoches': { lat: 31.74, lng: -93.08 },
  'Orleans': { lat: 29.97, lng: -90.07 },
  'Ouachita': { lat: 32.49, lng: -92.14 },
  'Plaquemines': { lat: 29.37, lng: -89.87 },
  'Pointe Coupee': { lat: 30.67, lng: -91.59 },
  'Rapides': { lat: 31.25, lng: -92.5 },
  'Red River': { lat: 32.07, lng: -93.36 },
  'Richland': { lat: 32.42, lng: -91.74 },
  'Sabine': { lat: 31.57, lng: -93.35 },
  'St. Bernard': { lat: 29.85, lng: -89.87 },
  'St. Charles': { lat: 29.94, lng: -90.42 },
  'St. Helena': { lat: 30.81, lng: -90.5 },
  'St. James': { lat: 29.99, lng: -90.78 },
  "St. John the Baptist": { lat: 30.1, lng: -90.48 },
  'St. Landry': { lat: 30.62, lng: -92.0 },
  'St. Martin': { lat: 30.12, lng: -91.6 },
  'St. Mary': { lat: 29.69, lng: -91.4 },
  'St. Tammany': { lat: 30.44, lng: -89.98 },
  'Tangipahoa': { lat: 30.63, lng: -90.46 },
  'Tensas': { lat: 32.05, lng: -91.35 },
  'Terrebonne': { lat: 29.28, lng: -90.87 },
  'Union': { lat: 32.83, lng: -92.38 },
  'Vermilion': { lat: 29.73, lng: -92.27 },
  'Vernon': { lat: 31.1, lng: -93.18 },
  'Washington': { lat: 30.82, lng: -89.93 },
  'Webster': { lat: 32.73, lng: -93.35 },
  'West Baton Rouge': { lat: 30.4, lng: -91.3 },
  'West Carroll': { lat: 32.83, lng: -91.5 },
  'West Feliciana': { lat: 30.82, lng: -91.48 },
  'Winn': { lat: 31.96, lng: -92.64 },
}
