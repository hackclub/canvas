export type ShipStatus = 'pending' | 'approved' | 'rejected'

// What a reviewer writes down for the Airtable spot-checkers when they review a ship
export interface ShipJustification {
  // Hours to count instead of what Hackatime says, null to leave them as they are
  overrideHours: number | null
  overrideHoursJustification: string
  specialTechnicalFeatures: string
  deflationJustification: string
  additionalJustification: string
}
