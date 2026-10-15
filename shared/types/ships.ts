export type ShipStatus = 'pending' | 'approved' | 'rejected'

// What a reviewer writes down for the Airtable spot-checkers when they review a ship
export interface ShipJustification {
  // Hours this ship is paid for, prefilled with its Hackatime hours since the last paid ship.
  // Required to approve, null on ships from before that.
  overrideHours: number | null
  specialTechnicalFeatures: string
  deflationJustification: string
  additionalJustification: string
}
