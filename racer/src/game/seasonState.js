import { newRD, upgradeRD } from './rd.js';
import { newStaff, staffMods } from './staff.js';

/**
 * Make sure a season save has everything the career screens read: the R&D state (current version) and
 * the team's staff, both for the team the player works for. Saves from before R&D or staff existed,
 * and seasons that haven't reached a race weekend yet, get them here. Returns true if anything changed.
 */
export function ensureSeasonState(s) {
  if (!s?.team) return false;
  let changed = false;
  if (!s.rd || s.rd.player !== s.team) { s.rd = newRD(s.team); changed = true; }
  upgradeRD(s.rd);
  if (!s.staff || s.staff.team !== s.team) { s.staff = newStaff(s.team); s.staff.team = s.team; changed = true; }
  s.rd.mods = staffMods(s.staff);
  return changed;
}
