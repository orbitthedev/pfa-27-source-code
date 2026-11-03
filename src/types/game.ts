/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Icon';

export interface PenStats {
  weightGrams: number; // Real-world weight in grams (e.g., 5.8g Bic, 11.2g Pilot G2, 23.5g Rotring)
  densityGramsPerCm3: number; // Material density (e.g., 1.05 polystyrene, 1.18 polycarbonate, 8.40 brass)
  realLifeLengthMm: number; // Real length in mm (128mm to 147mm)
  realLifeDiameterMm: number; // Real diameter in mm (8.3mm to 15.0mm)
  mass: number; // Physics normalized mass (proportional to real weight in grams, e.g. 0.58 to 2.35)
  length: number; // Canvas rendered length in pixels (80 to 110)
  width: number; // Canvas rendered width in pixels (11 to 20)
  friction: number; // Desk surface slide friction
  powerMultiplier: number; // Grip and flick efficiency multiplier
  spinMultiplier: number; // Torque sensitivity from off-center flick
  centerOfMassOffset: number; // Offset from geometric center (-0.25 to +0.25, cap vs tip bias)
  material: 'plastic' | 'resin' | 'steel' | 'brass';
}

export interface PenSkin {
  id: string;
  name: string;
  rarity: Rarity;
  penId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pattern: 'solid' | 'stripes' | 'neon_glow' | 'carbon' | 'metallic' | 'flame' | 'camo' | 'gold_leaf';
  unlocked: boolean;
}

export interface PenDefinition {
  id: string;
  name: string;
  brand: string;
  modelName: string;
  tagline: string;
  archetype: 'Featherweight' | 'Balanced' | 'Precision' | 'Momentum' | 'Heavyweight' | 'Master';
  rarity: Rarity;
  barrelMaterial: string;
  stats: PenStats;
  baseColor: string;
  gripColor: string;
  tipColor: string;
  clipColor: string;
  unlocked: boolean;
  requiredLevel: number;
  availableSkins: PenSkin[];
}

export interface FlickStyle {
  id: string;
  name: string;
  levelRequired: number;
  description: string;
  powerBonus: number;
  spinBonus: number;
  curveControl: number;
  iconName: string;
  unlocked: boolean;
}

export interface GeometryBox {
  id: string;
  name: string;
  tier: 'Wooden' | 'Classic Tin' | 'Golden Compass' | 'Architect Deluxe';
  costPaperclips: number;
  description: string;
  imagePath: string;
  dropRates: {
    Common: number;
    Rare: number;
    Epic: number;
    Legendary: number;
    Icon: number;
  };
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface PenEntity {
  id: string;
  owner: 'player1' | 'player2' | 'ai';
  name: string;
  brand: string;
  penId: string;
  skinId: string;
  pos: Vector2D;
  vel: Vector2D;
  angle: number; // in radians
  angularVel: number; // in rad/s
  stats: PenStats;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  clipColor: string;
  tipColor: string;
  pattern: PenSkin['pattern'];
  isKnockedOut: boolean;
  fallAnimationProgress?: number;
  trail: Vector2D[];
}

export interface DeskObstacle {
  id: string;
  type: 'eraser' | 'sharpener' | 'coin';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  color: string;
  label?: string;
}

export interface TournamentMatch {
  id: string;
  round: number;
  player1: { name: string; avatar: string; rating: number; isUser?: boolean };
  player2: { name: string; avatar: string; rating: number; isUser?: boolean };
  score: [number, number];
  winner?: 1 | 2;
  status: 'PENDING' | 'LIVE' | 'COMPLETED';
}

export interface Tournament {
  id: string;
  name: string;
  type: 'OPEN' | 'CLOSED';
  entryFeeClips: number;
  rewardClips: number;
  trophyName: string;
  difficulty: 'Amateur' | 'Pro' | 'World Class' | 'Legendary';
  matches: TournamentMatch[];
  currentRound: number;
  isCompleted: boolean;
  requiresPasscode?: boolean;
  passcode?: string;
  description: string;
}

export type DevicePlatform = 'mobile' | 'desktop';
export type CrossplaySetting = 'CROSSPLAY_ENABLED' | 'SAME_PLATFORM_ONLY';

export interface PlayerProfile {
  username: string;
  level: number;
  xp: number;
  xpNextLevel: number;
  paperclips: number;
  division: number;
  divisionPoints: number;
  totalWins: number;
  totalMatches: number;
  winStreak: number;
  equippedPenId: string;
  equippedSkinId: string;
  equippedFlickStyleId: string;
  unlockedPens: string[];
  unlockedSkins: string[];
  unlockedFlickStyles: string[];
  role?: 'ADMIN' | 'PLAYER';
  isAdmin?: boolean;
  platform?: DevicePlatform;
  crossplaySetting?: CrossplaySetting;
}

export type BotDifficulty = 'DUMMY' | 'ROOKIE' | 'NORMAL' | 'HARD' | 'CYBORG_APEX';

export type MatchMode = 'RANKED' | 'TOURNAMENT' | 'PASS_PLAY' | 'ONLINE_ROOM' | 'BOT_BATTLE';

export type GameView = 'HUB' | 'MATCH' | 'TOURNAMENT' | 'GEOMETRY_STORE' | 'LOCKER' | 'MULTIPLAYER' | 'DIVISIONS' | 'BOT_LAB';
