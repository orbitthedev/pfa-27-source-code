/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerProfile, Rarity } from '../types/game';
import { PENS_CATALOG, FLICK_STYLES } from '../data/initialData';

const STORAGE_KEY = 'pfa27_player_profile';

const DEFAULT_PROFILE: PlayerProfile = {
  username: 'DeskStriker27',
  level: 1,
  xp: 0,
  xpNextLevel: 100,
  paperclips: 240, // Starter bank to open an entry box immediately!
  division: 10,
  divisionPoints: 20,
  totalWins: 0,
  totalMatches: 0,
  winStreak: 0,
  equippedPenId: 'bic_cristal',
  equippedSkinId: 'skin_bic_classic_blue',
  equippedFlickStyleId: 'style_classic_thumb',
  unlockedPens: ['bic_cristal', 'pilot_g2'],
  unlockedSkins: ['skin_bic_classic_blue', 'skin_g2_midnight'],
  unlockedFlickStyles: ['style_classic_thumb'],
};

export function loadPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    const profile = { ...DEFAULT_PROFILE, ...parsed };

    // Migrate old generic IDs to real brands if needed
    if (!PENS_CATALOG.some((p) => p.id === profile.equippedPenId)) {
      profile.equippedPenId = 'bic_cristal';
      profile.equippedSkinId = 'skin_bic_classic_blue';
    }
    if (!profile.unlockedPens.includes('bic_cristal')) {
      profile.unlockedPens.push('bic_cristal');
    }
    if (!profile.unlockedPens.includes('pilot_g2')) {
      profile.unlockedPens.push('pilot_g2');
    }

    return profile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export interface MatchRewardResult {
  xpGained: number;
  clipsGained: number;
  leveledUp: boolean;
  newLevel: number;
  newFlickStylesUnlocked: string[];
  divisionPromoted: boolean;
  newDivision: number;
}

export function awardMatchWin(
  profile: PlayerProfile,
  isVictory: boolean,
  clipsBonus: number = 30
): { updatedProfile: PlayerProfile; reward: MatchRewardResult } {
  const updated = { ...profile };
  const baseXP = isVictory ? 50 : 15;
  const clips = isVictory ? clipsBonus : 5;

  updated.totalMatches += 1;
  if (isVictory) {
    updated.totalWins += 1;
    updated.winStreak += 1;
  } else {
    updated.winStreak = 0;
  }

  updated.paperclips += clips;
  updated.xp += baseXP;

  let leveledUp = false;
  const newStylesUnlocked: string[] = [];

  // Check level up
  while (updated.xp >= updated.xpNextLevel) {
    updated.xp -= updated.xpNextLevel;
    updated.level += 1;
    updated.xpNextLevel = Math.floor(updated.xpNextLevel * 1.35);
    leveledUp = true;

    // Check newly unlocked flick styles
    for (const style of FLICK_STYLES) {
      if (updated.level >= style.levelRequired && !updated.unlockedFlickStyles.includes(style.id)) {
        updated.unlockedFlickStyles.push(style.id);
        newStylesUnlocked.push(style.name);
      }
    }

    // Check newly unlocked pens by level
    for (const pen of PENS_CATALOG) {
      if (updated.level >= pen.requiredLevel && !updated.unlockedPens.includes(pen.id)) {
        updated.unlockedPens.push(pen.id);
      }
    }
  }

  // Division progression
  let divisionPromoted = false;
  if (isVictory) {
    updated.divisionPoints += 25;
    if (updated.divisionPoints >= 100 && updated.division > 1) {
      updated.division -= 1; // 10 -> 9 -> ... -> 1
      updated.divisionPoints = 0;
      divisionPromoted = true;
    }
  } else {
    updated.divisionPoints = Math.max(0, updated.divisionPoints - 10);
  }

  savePlayerProfile(updated);

  return {
    updatedProfile: updated,
    reward: {
      xpGained: baseXP,
      clipsGained: clips,
      leveledUp,
      newLevel: updated.level,
      newFlickStylesUnlocked: newStylesUnlocked,
      divisionPromoted,
      newDivision: updated.division,
    },
  };
}

export function unlockItemInProfile(
  profile: PlayerProfile,
  itemType: 'pen' | 'skin',
  itemId: string
): PlayerProfile {
  const updated = { ...profile };
  if (itemType === 'pen' && !updated.unlockedPens.includes(itemId)) {
    updated.unlockedPens.push(itemId);
  } else if (itemType === 'skin' && !updated.unlockedSkins.includes(itemId)) {
    updated.unlockedSkins.push(itemId);
  }
  savePlayerProfile(updated);
  return updated;
}
