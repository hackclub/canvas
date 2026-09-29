// Shared between the canvas page and the server, so both agree on the board.
export const CANVAS_WIDTH = 350
export const CANVAS_HEIGHT = 200

// Colors people can draw with, in palette order. Pixels are stored as their RGB value
// (not their index here), so this list can be reordered or changed later without
// breaking what's already on the canvas.
export const CANVAS_COLORS = [
  '#ff6464',
  '#ffc64d',
  '#f9ed0a',
  '#4eef49',
  '#89bdff',
  '#dcb4ff',
  '#ffffff',
  '#9badb7',
  '#000000',
] as const

// What an untouched pixel looks like
export const CANVAS_BACKGROUND = 0xffffff

// Most pixels a single POST /api/canvas can place
export const CANVAS_MAX_BATCH = 2000

export function hexToRgb(hex: string) {
  return parseInt(hex.slice(1), 16)
}

export function rgbToHex(rgb: number) {
  return `#${rgb.toString(16).padStart(6, '0')}`
}
