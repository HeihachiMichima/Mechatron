// House rules: values the rulebook doesn't give (or leaves to the GM).
// Every entry here is shown in the app with a « règle maison » badge and can be
// changed by the GM. Book values stay in data.js — never put a book number here.
// Filled ticket by ticket (T09 market, T11 XP, T12 grid…).
export const HOUSE = {
  // Black market (T09). The book only says it is run by Scrap Robots and that
  // modules are rare and valuable (p.73, p.116-117); everything below is ours.
  market: {
    // Selling back: half the price, rounded, at least 1 EP.
    sellRate: 0.5,
    sellMin: 1,
    // Rarity tiers: chance that an item shows up on a given day (T10). 0 = only
    // when the GM puts it in the market.
    rarities: [
      { id: 'commun', label: 'Commun', chance: 1 },
      { id: 'peu-commun', label: 'Peu commun', chance: 1 / 2 },
      { id: 'rare', label: 'Rare', chance: 1 / 6 },
      { id: 'unique', label: 'Unique', chance: 0 }
    ],
    // Default rarity of each kind of item in the catalog.
    rarityByKind: { module: 'rare', part: 'peu-commun', weapon: 'commun', equipment: 'commun', custom: 'commun' }
  },
  // Square grid (T12). The book measures range in bands (p.82: Arm's Length
  // "just next to each other", Near "a few steps away", Short "up to 20-30
  // yards", Long "up to a few hundred yards") and movement in maneuvers per band.
  // The square size, the Near edge and the squares per maneuver are ours.
  grid: {
    squareM: 2,                                  // 1 square = 2 m
    bands: { Bras: 1, Proche: 3, Courte: 12 },   // farthest square of each band; beyond Courte = Longue
    moveSquares: 4                               // squares per maneuver (reach overlay only, never enforced)
  }
};
