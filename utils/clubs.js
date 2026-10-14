// Default average club distances in yards, longest first. Changed on the
// phone in the Golf Tracker settings; the watch uses whatever list it was sent.
export const DEFAULT_CLUBS = [
  { name: 'Dr', yards: 230 }, // Driver
  { name: '3W', yards: 220 }, // 3 Wood
  { name: '3R', yards: 200 }, // Rescue
  { name: '4I', yards: 190 },
  { name: '5I', yards: 175 },
  { name: '6I', yards: 161 },
  { name: '7I', yards: 152 },
  { name: '8I', yards: 137 },
  { name: '9I', yards: 122 },
  { name: 'PW', yards: 107 },
  { name: 'GW', yards: 92 }
]

// Full names for the settings page
export const CLUB_NAMES = {
  Dr: 'Driver',
  '3W': '3 Wood',
  '3R': 'Rescue',
  '4I': '4 Iron',
  '5I': '5 Iron',
  '6I': '6 Iron',
  '7I': '7 Iron',
  '8I': '8 Iron',
  '9I': '9 Iron',
  PW: 'Pitching wedge',
  GW: 'Gap wedge'
}

// Aim this far past the pin (front, middle or back)
const PIN_ALLOWANCE_YARDS = 3
// If the target is more than this past a club's average, club up
const CLUB_UP_YARDS = 3

// Shortest club that reaches within CLUB_UP_YARDS of pin + allowance.
// e.g. pin 162-175 -> target 165-178 -> 5I; target 141-155 -> 7I.
// Beyond the longest club's range it still shows the longest club.
// All distances are yards, whatever units are shown.
export function clubFor(pinYards, clubs = DEFAULT_CLUBS) {
  const target = pinYards + PIN_ALLOWANCE_YARDS
  const byLength = clubs.slice().sort((a, b) => b.yards - a.yards)
  for (let i = byLength.length - 1; i >= 0; i--) {
    if (target <= byLength[i].yards + CLUB_UP_YARDS) return byLength[i].name
  }
  return byLength[0].name
}
