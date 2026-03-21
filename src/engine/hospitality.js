/**
 * ZAN Financial Engine — Hospitality P&L Calculators
 * @module engine/hospitality
 * 
 * Zero dependencies. Used by cashflow.js (computeProjectCashFlows).
 */

export function calcHotelEBITDA(h) {
  const roomsRev = (h.keys || 0) * (h.adr || 0) * ((h.stabOcc || 0) / 100) * (h.daysYear || 365);
  const totalRev = (h.roomsPct || 0) > 0 ? roomsRev / ((h.roomsPct || 72) / 100) : 0;
  const fbRev = totalRev * ((h.fbPct || 0) / 100);
  const miceRev = totalRev * ((h.micePct || 0) / 100);
  const otherRev = totalRev * ((h.otherPct || 0) / 100);
  const roomExp = roomsRev * ((h.roomExpPct || 0) / 100);
  const fbExp = fbRev * ((h.fbExpPct || 0) / 100);
  const miceExp = miceRev * ((h.miceExpPct || 0) / 100);
  const otherExp = otherRev * ((h.otherExpPct || 0) / 100);
  const undist = totalRev * ((h.undistPct || 0) / 100);
  const fixed = totalRev * ((h.fixedPct || 0) / 100);
  const totalOpex = roomExp + fbExp + miceExp + otherExp + undist + fixed;
  const ebitda = totalRev - totalOpex;
  return { roomsRev, totalRev, fbRev, miceRev, otherRev, roomExp, fbExp, miceExp, otherExp, undist, fixed, totalOpex, ebitda, margin: totalRev > 0 ? ebitda / totalRev : 0 };
}

export function calcMarinaEBITDA(m) {
  const berthingRev = (m.berths || 0) * (m.avgLength || 0) * (m.unitPrice || 0) * ((m.stabOcc || 0) / 100);
  const berthingPct = 100 - (m.fuelPct || 0) - (m.otherRevPct || 0);
  const totalRev = berthingPct > 0 ? berthingRev / (berthingPct / 100) : 0;
  const fuelRev = totalRev * ((m.fuelPct || 0) / 100);
  const otherRev = totalRev * ((m.otherRevPct || 0) / 100);
  const berthingOpex = berthingRev * ((m.berthingOpexPct || 0) / 100);
  const fuelOpex = fuelRev * ((m.fuelOpexPct || 0) / 100);
  const otherOpex = otherRev * ((m.otherOpexPct || 0) / 100);
  const totalOpex = berthingOpex + fuelOpex + otherOpex;
  const ebitda = totalRev - totalOpex;
  return { berthingRev, totalRev, fuelRev, otherRev, berthingOpex, fuelOpex, otherOpex, totalOpex, ebitda, margin: totalRev > 0 ? ebitda / totalRev : 0 };
}
