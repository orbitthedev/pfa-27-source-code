/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PenEntity, DeskObstacle, PlayerProfile, FlickStyle, PenDefinition, BotDifficulty, MatchMode } from '../types/game';
import { PENS_CATALOG, FLICK_STYLES, BOT_DIFFICULTIES } from '../data/initialData';
import { stepPhysics, DeskBounds, distance, normalize } from '../physics/penPhysics';
import { sounds } from '../utils/audio';
import { triggerHaptic, detectDevicePlatform } from '../utils/device';
import { PenChangeModal } from './PenChangeModal';
import { RotateCcw, Zap, Compass, ShieldAlert, Award, Camera, Scale, RefreshCw, Smartphone, Laptop, SlidersHorizontal, Bot } from 'lucide-react';

interface DeskArenaProps {
  mode: MatchMode;
  playerProfile: PlayerProfile;
  botDifficulty?: BotDifficulty;
  botPenId?: string;
  opponentName?: string;
  opponentAvatar?: string;
  onMatchComplete: (winner: 'player1' | 'player2') => void;
  onExitMatch: () => void;
  onEquipPen?: (penId: string) => void;
  onSendFlick?: (power: number, angle: number, curve: number, styleId: string) => void;
  incomingOnlineFlick?: { power: number; angle: number; curve: number; styleId: string } | null;
  godModePower?: number;
  playerPlatform?: 'mobile' | 'desktop';
  opponentPlatform?: 'mobile' | 'desktop';
  crossplay?: boolean;
}

const DESK_WIDTH = 840;
const DESK_HEIGHT = 520;
const TABLE_BOUNDS: DeskBounds = {
  x: 50,
  y: 40,
  width: DESK_WIDTH - 100,
  height: DESK_HEIGHT - 80,
};

export const DeskArena: React.FC<DeskArenaProps> = ({
  mode,
  playerProfile,
  botDifficulty = 'NORMAL',
  botPenId,
  opponentName = 'RivalStriker_X',
  opponentAvatar = '🎯',
  onMatchComplete,
  onExitMatch,
  onEquipPen,
  onSendFlick,
  incomingOnlineFlick,
  godModePower = 1.0,
  playerPlatform = detectDevicePlatform(),
  opponentPlatform = 'desktop',
  crossplay = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Match state
  const [roundScore, setRoundScore] = useState<[number, number]>([0, 0]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [activeTurn, setActiveTurn] = useState<'player1' | 'player2'>('player1');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [matchWinner, setMatchWinner] = useState<'player1' | 'player2' | null>(null);
  const [knockoutBanner, setKnockoutBanner] = useState<string | null>(null);
  const [slowMoReplay, setSlowMoReplay] = useState<boolean>(false);

  // Mobile ergonomics & Pass & Play state
  const isMobileDevice = playerPlatform === 'mobile';
  const [useVirtualFlickPad, setUseVirtualFlickPad] = useState<boolean>(isMobileDevice);
  const [passPlayNotice, setPassPlayNotice] = useState<string | null>(null);
  const lastPowerBracketRef = useRef<number>(-1);

  // Pen change modal
  const [showPenChangeModal, setShowPenChangeModal] = useState<boolean>(false);

  // Flick controls
  const [selectedFlickStyle, setSelectedFlickStyle] = useState<FlickStyle>(() => {
    return FLICK_STYLES.find((s) => s.id === playerProfile.equippedFlickStyleId) || FLICK_STYLES[0];
  });
  const [curveModifier, setCurveModifier] = useState<number>(0);
  const [aimState, setAimState] = useState<{
    isAiming: boolean;
    startPos: { x: number; y: number };
    currentPos: { x: number; y: number };
    powerNormalized: number;
    angle: number;
  }>({
    isAiming: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    powerNormalized: 0,
    angle: 0,
  });

  // Desk texture image
  const deskTextureRef = useRef<HTMLImageElement | null>(null);

  // Entities in simulation
  const pensRef = useRef<PenEntity[]>([]);
  const obstaclesRef = useRef<DeskObstacle[]>([
    {
      id: 'eraser_center',
      type: 'eraser',
      x: DESK_WIDTH / 2 - 28,
      y: DESK_HEIGHT / 2 - 16,
      width: 56,
      height: 32,
      angle: 0.1,
      color: '#fb7185',
      label: 'ERASER',
    },
    {
      id: 'sharpener_top',
      type: 'sharpener',
      x: DESK_WIDTH / 2 + 130,
      y: 110,
      width: 32,
      height: 38,
      angle: -0.2,
      color: '#38bdf8',
      label: 'STEEL',
    },
  ]);

  // Reset pens to initial face-off positions
  const resetRoundPositions = useCallback(() => {
    const userPenDef =
      PENS_CATALOG.find((p) => p.id === playerProfile.equippedPenId) || PENS_CATALOG[0];
    const userSkin =
      userPenDef.availableSkins.find((s) => s.id === playerProfile.equippedSkinId) ||
      userPenDef.availableSkins[0];

    // Pick opponent pen: if in Bot Lab, use the chosen bot pen; otherwise use standard rival pen
    const oppPenDef =
      (mode === 'BOT_BATTLE' && botPenId
        ? PENS_CATALOG.find((p) => p.id === botPenId)
        : null) ||
      PENS_CATALOG[4] ||
      PENS_CATALOG[1];
    const oppSkin = oppPenDef.availableSkins[0];

    pensRef.current = [
      {
        id: 'pen_player1',
        owner: 'player1',
        name: userPenDef.name,
        brand: userPenDef.brand,
        penId: userPenDef.id,
        skinId: userSkin.id,
        pos: { x: TABLE_BOUNDS.x + 120, y: DESK_HEIGHT / 2 },
        vel: { x: 0, y: 0 },
        angle: 0,
        angularVel: 0,
        stats: { ...userPenDef.stats },
        primaryColor: userSkin.primaryColor,
        secondaryColor: userSkin.secondaryColor,
        accentColor: userSkin.accentColor,
        clipColor: userPenDef.clipColor,
        tipColor: userPenDef.tipColor,
        pattern: userSkin.pattern,
        isKnockedOut: false,
        trail: [],
      },
      {
        id: 'pen_player2',
        owner: mode === 'BOT_BATTLE' ? 'ai' : 'player2',
        name: mode === 'BOT_BATTLE' ? `[AI BOT] ${opponentName}` : oppPenDef.name,
        brand: oppPenDef.brand,
        penId: oppPenDef.id,
        skinId: oppSkin.id,
        pos: { x: TABLE_BOUNDS.x + TABLE_BOUNDS.width - 120, y: DESK_HEIGHT / 2 },
        vel: { x: 0, y: 0 },
        angle: Math.PI,
        angularVel: 0,
        stats: { ...oppPenDef.stats },
        primaryColor: oppSkin.primaryColor,
        secondaryColor: oppSkin.secondaryColor,
        accentColor: oppSkin.accentColor,
        clipColor: oppPenDef.clipColor,
        tipColor: oppPenDef.tipColor,
        pattern: oppSkin.pattern,
        isKnockedOut: false,
        trail: [],
      },
    ];

    setIsSimulating(false);
    setKnockoutBanner(null);
  }, [playerProfile, mode, botPenId, opponentName]);

  // Load desk background texture once
  useEffect(() => {
    const img = new Image();
    img.src = '/images/desk_arena_surface.jpg';
    img.onload = () => {
      deskTextureRef.current = img;
    };
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.src = '/src/assets/images/desk_arena_surface_1793632079226.jpg';
      fallbackImg.onload = () => {
        deskTextureRef.current = fallbackImg;
      };
    };
    resetRoundPositions();
  }, [resetRoundPositions]);

  // Execute realistic physics flick with strict mass-dependent impulse: v = J / m
  const executeFlick = useCallback(
    (penId: string, powerNormalized: number, angle: number, curve: number, style: FlickStyle) => {
      const pen = pensRef.current.find((p) => p.id === penId);
      if (!pen || pen.isKnockedOut) return;

      // In real physics: Delta V = Impulse / Mass
      // A standard finger flick delivers impulse J.
      // Light pen (5.8g Bic, mass 0.58) -> high velocity. Heavy pen (23.5g Rotring, mass 2.35) -> lower velocity, high momentum!
      const impulseMultiplier = pen.owner === 'player1' ? godModePower : 1.0;
      const baseImpulse = 18.0 * style.powerBonus * powerNormalized * impulseMultiplier;
      const speed = (baseImpulse / pen.stats.mass) * pen.stats.powerMultiplier;

      pen.vel.x = Math.cos(angle) * speed;
      pen.vel.y = Math.sin(angle) * speed;

      // Angular impulse: Torque = r x J; Delta Omega = Torque / Inertia
      const baseTorque = curve * 7.5 * style.spinBonus * pen.stats.spinMultiplier;
      pen.angularVel = baseTorque / Math.max(0.6, pen.stats.mass * 0.8);

      sounds.playFlick(powerNormalized);
      triggerHaptic('medium');
      setIsSimulating(true);
    },
    [godModePower]
  );

  // Handle incoming online flick
  useEffect(() => {
    if (incomingOnlineFlick && mode === 'ONLINE_ROOM') {
      const style =
        FLICK_STYLES.find((s) => s.id === incomingOnlineFlick.styleId) || FLICK_STYLES[0];
      executeFlick(
        'pen_player2',
        incomingOnlineFlick.power,
        incomingOnlineFlick.angle,
        incomingOnlineFlick.curve,
        style
      );
    }
  }, [incomingOnlineFlick, mode, executeFlick]);

  // AI Opponent move calculation - Strictly active ONLY in BOT_BATTLE mode
  const triggerAiFlick = useCallback(() => {
    // Safety check: Never run AI in Ranked, Pass & Play, or Online Room modes!
    if (mode !== 'BOT_BATTLE') return;

    const aiPen = pensRef.current.find((p) => p.id === 'pen_player2');
    const playerPen = pensRef.current.find((p) => p.id === 'pen_player1');
    if (!aiPen || !playerPen || aiPen.isKnockedOut || playerPen.isKnockedOut) return;

    const diffConfig =
      BOT_DIFFICULTIES.find((d) => d.id === botDifficulty) || BOT_DIFFICULTIES[2];

    const dx = playerPen.pos.x - aiPen.pos.x;
    const dy = playerPen.pos.y - aiPen.pos.y;
    const dist = Math.hypot(dx, dy);
    const baseAngle = Math.atan2(dy, dx);

    // Calculate distance to table boundaries
    const playerDistLeft = playerPen.pos.x - TABLE_BOUNDS.x;
    const playerDistRight = TABLE_BOUNDS.x + TABLE_BOUNDS.width - playerPen.pos.x;
    const playerDistTop = playerPen.pos.y - TABLE_BOUNDS.y;
    const playerDistBottom = TABLE_BOUNDS.y + TABLE_BOUNDS.height - playerPen.pos.y;
    const minPlayerRim = Math.min(playerDistLeft, playerDistRight, playerDistTop, playerDistBottom);

    const aiDistLeft = aiPen.pos.x - TABLE_BOUNDS.x;
    const aiDistRight = TABLE_BOUNDS.x + TABLE_BOUNDS.width - aiPen.pos.x;
    const aiDistTop = aiPen.pos.y - TABLE_BOUNDS.y;
    const aiDistBottom = TABLE_BOUNDS.y + TABLE_BOUNDS.height - aiPen.pos.y;
    const minAiRim = Math.min(aiDistLeft, aiDistRight, aiDistTop, aiDistBottom);

    let targetAngle = baseAngle;
    let power = 0.5;
    let curve = 0;
    let chosenStyle = FLICK_STYLES[0];

    switch (diffConfig.id) {
      case 'DUMMY': {
        // Stupider AI: Wild erratic aim, pathetic underpower or suicidal full-power flings
        const aimError = (Math.random() - 0.5) * 1.3; // ±75° wobble
        targetAngle = baseAngle + aimError;

        const behaviorRoll = Math.random();
        if (behaviorRoll < 0.45) {
          // Underpower misfire (pen barely creeps forward 3cm)
          power = 0.12 + Math.random() * 0.14;
        } else if (behaviorRoll < 0.8) {
          // Suicide fling: overpowered impulse directly toward the nearest rim
          power = 0.96 + Math.random() * 0.04;
          if (Math.random() < 0.5) {
            // Aim straight at edge instead of player!
            targetAngle += (Math.random() - 0.5) * 1.5;
          }
        } else {
          // Semi-random shot
          power = 0.45 + (Math.random() - 0.5) * 0.3;
        }
        curve = (Math.random() - 0.5) * 0.5;
        break;
      }

      case 'ROOKIE': {
        // Rookie AI: Shaky aim, misjudged friction, no rim safety
        targetAngle = baseAngle + (Math.random() - 0.5) * 0.48; // ±27° wobble
        power = Math.min(
          1.0,
          Math.max(0.25, (dist / 380) * (aiPen.stats.mass / 1.1) + (Math.random() - 0.5) * 0.38)
        );
        curve = (Math.random() - 0.5) * 0.25;
        break;
      }

      case 'NORMAL': {
        // Balanced AI: Decent fundamentals, consistent power, minor variance
        targetAngle = baseAngle + (Math.random() - 0.5) * 0.14; // ±8°
        power = Math.min(1.0, Math.max(0.35, (dist / 400) * (aiPen.stats.mass / 1.1)));
        if (minPlayerRim < 85) {
          power = Math.min(1.0, power * 1.25);
        }
        curve = (Math.random() - 0.5) * 0.1;
        break;
      }

      case 'HARD': {
        // Smarter AI: Pushes player toward nearest rim, checks self-preservation
        let rimDx = 0;
        let rimDy = 0;
        if (minPlayerRim === playerDistLeft) rimDx = -1;
        else if (minPlayerRim === playerDistRight) rimDx = 1;
        else if (minPlayerRim === playerDistTop) rimDy = -1;
        else rimDy = 1;

        const rimAngle = Math.atan2(rimDy, rimDx);
        const bias = Math.sin(rimAngle - baseAngle) * 0.12;
        targetAngle = baseAngle + bias + (Math.random() - 0.5) * 0.035;

        const massRatio = playerPen.stats.mass / aiPen.stats.mass;
        power = Math.min(1.0, Math.max(0.42, (dist / 360) * Math.sqrt(massRatio) * 1.18));

        // Self-preservation: if bot is close to edge, prevent self-knockout
        if (minAiRim < 85) {
          power = Math.min(0.68, power);
        }
        chosenStyle = FLICK_STYLES[1] || FLICK_STYLES[0];
        curve = (Math.random() - 0.5) * 0.15;
        break;
      }

      case 'CYBORG_APEX': {
        // Mastermind AI: Exact physics prediction, spin induction, zero suicide
        const playerHalfL = playerPen.stats.length / 2;
        // Hit off-center (tip or cap) to induce high rotational spin and destabilize player
        const cornerOffset = playerHalfL * 0.35;
        const contactX = playerPen.pos.x + Math.cos(playerPen.angle) * cornerOffset;
        const contactY = playerPen.pos.y + Math.sin(playerPen.angle) * cornerOffset;

        targetAngle = Math.atan2(contactY - aiPen.pos.y, contactX - aiPen.pos.x);

        // Required impulse to push player past rim
        const neededSpeed = Math.sqrt(2 * playerPen.stats.friction * 980 * (minPlayerRim + 45));
        const impulse = (neededSpeed * playerPen.stats.mass) / playerPen.stats.powerMultiplier;
        const calculatedPower = (impulse * aiPen.stats.mass) / (18.0 * 1.25);
        power = Math.min(1.0, Math.max(0.46, calculatedPower));

        // Strict boundary check: Ensure bot does not slide off after impact
        const maxSafeTravel = Math.max(15, minAiRim - 25);
        const maxSafeSpeed = Math.sqrt(2 * aiPen.stats.friction * 980 * maxSafeTravel);
        const maxSafePower = (maxSafeSpeed * aiPen.stats.mass) / 18.0;
        if (power > maxSafePower && maxSafePower > 0.38) {
          power = maxSafePower;
        }

        chosenStyle = FLICK_STYLES[2] || FLICK_STYLES[0];
        curve = minPlayerRim < 120 ? -0.08 : 0.08;
        break;
      }
    }

    executeFlick('pen_player2', power, targetAngle, curve, chosenStyle);
  }, [executeFlick, mode, botDifficulty]);

  // Render authentic silhouettes for real pen brands
  const drawRealPenSilhouette = (ctx: CanvasRenderingContext2D, pen: PenEntity) => {
    const halfL = pen.stats.length / 2;
    const halfW = pen.stats.width / 2;

    if (pen.penId === 'bic_cristal') {
      // Bic Cristal: Transparent hexagonal faceted body with blue ink tube & brass tip
      // Hexagonal facets
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(-halfL, -halfW, pen.stats.length, pen.stats.width);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-halfL, -halfW, pen.stats.length, pen.stats.width);

      // Central blue ink cartridge
      ctx.fillStyle = pen.primaryColor;
      ctx.fillRect(-halfL + 6, -1.8, pen.stats.length - 16, 3.6);

      // Brass point & tungsten carbide ball
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW * 0.6);
      ctx.lineTo(halfL + 12, 0);
      ctx.lineTo(halfL, halfW * 0.6);
      ctx.closePath();
      ctx.fill();

      // Rear vented end-plug
      ctx.fillStyle = pen.primaryColor;
      ctx.fillRect(-halfL, -halfW, 8, pen.stats.width);
    } else if (pen.penId === 'rotring_600') {
      // Rotring 600: Matte black milled brass hexagonal body with knurled grip & red ring
      ctx.fillStyle = pen.primaryColor;
      ctx.beginPath();
      ctx.roundRect(-halfL, -halfW, pen.stats.length, pen.stats.width, 1);
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Knurled grip pattern near tip
      ctx.fillStyle = '#27272a';
      ctx.fillRect(halfL - 28, -halfW, 18, pen.stats.width);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(halfL - 28 + k * 3.5, -halfW);
        ctx.lineTo(halfL - 28 + k * 3.5, halfW);
        ctx.stroke();
      }

      // Iconic Rotring Red Ring accent
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-halfL + 12, -halfW - 1, 3.5, pen.stats.width + 2);

      // Drafting lead sleeve / steel tip
      ctx.fillStyle = '#a1a1aa';
      ctx.fillRect(halfL, -1.5, 9, 3);
    } else if (pen.penId === 'parker_jotter') {
      // Parker Jotter: Brushed stainless steel upper cap with iconic arrow clip + plastic lower
      // Lower plastic barrel
      ctx.fillStyle = pen.primaryColor;
      ctx.fillRect(0, -halfW, halfL, pen.stats.width);

      // Upper brushed stainless steel cap
      const steelGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
      steelGrad.addColorStop(0, '#f1f5f9');
      steelGrad.addColorStop(0.5, '#cbd5e1');
      steelGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = steelGrad;
      ctx.fillRect(-halfL, -halfW, halfL, pen.stats.width);

      // Parker Arrow clip
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-halfL + 3, -halfW - 3, 24, 2.5);
      ctx.beginPath();
      ctx.moveTo(-halfL + 27, -halfW - 4.5);
      ctx.lineTo(-halfL + 31, -halfW - 2);
      ctx.lineTo(-halfL + 27, -halfW + 0.5);
      ctx.closePath();
      ctx.fill();

      // Steel clicker button at rear
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-halfL - 4, -halfW * 0.45, 4, pen.stats.width * 0.9);

      // Tip
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW * 0.6);
      ctx.lineTo(halfL + 8, 0);
      ctx.lineTo(halfL, halfW * 0.6);
      ctx.fill();
    } else if (pen.penId === 'lamy_safari') {
      // Lamy Safari: Faceted ergonomic barrel with twin ink windows & oversized spring brass clip
      ctx.fillStyle = pen.primaryColor;
      ctx.beginPath();
      ctx.roundRect(-halfL, -halfW, pen.stats.length, pen.stats.width, 2);
      ctx.fill();

      // Oval ink inspection window
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(0, -2, 10, 4, 2);
      ctx.fill();

      // Oversized spring brass wire clip
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-halfL + 4, -halfW - 3);
      ctx.lineTo(-halfL + 34, -halfW - 3);
      ctx.lineTo(-halfL + 34, -halfW + 1);
      ctx.stroke();

      // Black/silver Lamy steel nib
      ctx.fillStyle = pen.tipColor;
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW * 0.6);
      ctx.lineTo(halfL + 11, 0);
      ctx.lineTo(halfL, halfW * 0.6);
      ctx.fill();
    } else {
      // Default / Pilot G2 / Zebra Sarasa: Contoured barrel, rubber grip, and spring clip
      const bodyGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
      bodyGrad.addColorStop(0, pen.primaryColor);
      bodyGrad.addColorStop(0.5, pen.secondaryColor);
      bodyGrad.addColorStop(1, pen.primaryColor);
      ctx.fillStyle = bodyGrad;

      ctx.beginPath();
      ctx.roundRect(-halfL, -halfW, pen.stats.length, pen.stats.width, 3);
      ctx.fill();

      // Rubber grip grooves
      ctx.fillStyle = pen.accentColor;
      ctx.fillRect(halfL - 24, -halfW, 14, pen.stats.width);

      // Spring clip
      ctx.fillStyle = pen.clipColor || '#94a3b8';
      ctx.fillRect(-halfL + 3, -halfW - 3, 20, 2.5);

      // Metal tip cone
      ctx.fillStyle = pen.stats.material === 'brass' ? '#fbbf24' : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW * 0.7);
      ctx.lineTo(halfL + 10, 0);
      ctx.lineTo(halfL, halfW * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Main Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.033, (time - lastTime) / 1000);
      lastTime = time;

      if (isSimulating) {
        const stepRate = slowMoReplay ? 0.35 : 1.0;
        const result = stepPhysics(pensRef.current, obstaclesRef.current, TABLE_BOUNDS, dt * stepRate);

        for (const col of result.collisions) {
          sounds.playDeskImpact(col.intensity, col.material);
          triggerHaptic(col.intensity > 0.5 ? 'heavy' : 'light');
        }

        const p1 = pensRef.current.find((p) => p.id === 'pen_player1');
        const p2 = pensRef.current.find((p) => p.id === 'pen_player2');

        const p1Out = p1?.isKnockedOut;
        const p2Out = p2?.isKnockedOut;

        if (p1Out || p2Out) {
          if (!knockoutBanner) {
            sounds.playKnockout();
            triggerHaptic('knockout');
            if (p1Out && p2Out) {
              setKnockoutBanner('DOUBLE RING OUT! REPLAY ROUND');
            } else if (p2Out) {
              setKnockoutBanner(`${p1?.name || 'Player 1'} KNOCKOUT STRIKE!`);
            } else {
              setKnockoutBanner(`${p2?.name || 'Opponent'} KNOCKOUT STRIKE!`);
            }
          }
        }

        if (result.allStopped) {
          setIsSimulating(false);

          if (p1Out || p2Out) {
            setTimeout(() => {
              if (p1Out && p2Out) {
                resetRoundPositions();
              } else if (p2Out) {
                setRoundScore(([s1, s2]) => {
                  const newScore: [number, number] = [s1 + 1, s2];
                  if (newScore[0] >= 2) {
                    setMatchWinner('player1');
                    onMatchComplete('player1');
                  } else {
                    setCurrentRound((r) => r + 1);
                    resetRoundPositions();
                  }
                  return newScore;
                });
              } else {
                setRoundScore(([s1, s2]) => {
                  const newScore: [number, number] = [s1, s2 + 1];
                  if (newScore[1] >= 2) {
                    setMatchWinner('player2');
                    onMatchComplete('player2');
                  } else {
                    setCurrentRound((r) => r + 1);
                    resetRoundPositions();
                  }
                  return newScore;
                });
              }
            }, 1400);
          } else {
            setActiveTurn((prev) => {
              const nextTurn = prev === 'player1' ? 'player2' : 'player1';
              if (mode === 'PASS_PLAY') {
                setPassPlayNotice(nextTurn === 'player1' ? playerProfile.username : (opponentName || 'Player 2'));
                triggerHaptic('heavy');
              }
              if (nextTurn === 'player2' && mode === 'BOT_BATTLE') {
                setTimeout(() => {
                  triggerAiFlick();
                }, 800);
              }
              return nextTurn;
            });
          }
        }
      }

      // Render Desk surface
      ctx.clearRect(0, 0, DESK_WIDTH, DESK_HEIGHT);

      if (deskTextureRef.current) {
        ctx.drawImage(deskTextureRef.current, 0, 0, DESK_WIDTH, DESK_HEIGHT);
        const grad = ctx.createRadialGradient(
          DESK_WIDTH / 2,
          DESK_HEIGHT / 2,
          200,
          DESK_WIDTH / 2,
          DESK_HEIGHT / 2,
          500
        );
        grad.addColorStop(0, 'rgba(0,0,0,0.1)');
        grad.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, DESK_WIDTH, DESK_HEIGHT);
      } else {
        ctx.fillStyle = '#6b4f2c';
        ctx.fillRect(0, 0, DESK_WIDTH, DESK_HEIGHT);
      }

      // Table Boundary Line (Knockout Perimeter)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(TABLE_BOUNDS.x, TABLE_BOUNDS.y, TABLE_BOUNDS.width, TABLE_BOUNDS.height);
      ctx.setLineDash([]);

      // Desk ruler markings
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '10px monospace';
      for (let i = 0; i <= TABLE_BOUNDS.width; i += 40) {
        const x = TABLE_BOUNDS.x + i;
        ctx.fillRect(x, TABLE_BOUNDS.y, 1, 8);
        if (i % 80 === 0) {
          ctx.fillText(`${i / 20}cm`, x - 10, TABLE_BOUNDS.y + 18);
        }
      }

      // Center Court circle
      ctx.beginPath();
      ctx.arc(DESK_WIDTH / 2, DESK_HEIGHT / 2, 60, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212, 248, 42, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Obstacles
      for (const obs of obstaclesRef.current) {
        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
        ctx.rotate(obs.angle);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-obs.width / 2 + 3, -obs.height / 2 + 4, obs.width, obs.height);

        ctx.fillStyle = obs.color;
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);

        if (obs.label) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obs.label, 0, 0);
        }
        ctx.restore();
      }

      // Draw Pens with Authentic Silhouettes
      for (const pen of pensRef.current) {
        if (pen.isKnockedOut && pen.fallAnimationProgress && pen.fallAnimationProgress >= 1) {
          continue;
        }

        ctx.save();
        ctx.translate(pen.pos.x, pen.pos.y);
        ctx.rotate(pen.angle);

        const scale = pen.isKnockedOut && pen.fallAnimationProgress
          ? Math.max(0.1, 1 - pen.fallAnimationProgress * 0.6)
          : 1.0;
        ctx.scale(scale, scale);

        const halfL = pen.stats.length / 2;
        const halfW = pen.stats.width / 2;

        // Shadow on wooden desk
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.roundRect(-halfL + 4, -halfW + 5, pen.stats.length, pen.stats.width, 3);
        ctx.fill();

        // Active turn outline glow
        if (activeTurn === pen.owner && !isSimulating) {
          ctx.strokeStyle = '#d4f82a';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-halfL - 5, -halfW - 5, pen.stats.length + 10, pen.stats.width + 10);
        }

        // Real pen brand graphics
        drawRealPenSilhouette(ctx, pen);

        // Real weight label beneath pen
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${pen.stats.weightGrams}g`, 0, halfW + 10);

        ctx.restore();
      }

      // Slingshot Aim Arrow & Prediction Line
      if (aimState.isAiming) {
        const activePen = pensRef.current.find((p) => p.owner === activeTurn);
        if (activePen) {
          ctx.save();
          const { x: px, y: py } = activePen.pos;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(aimState.currentPos.x, aimState.currentPos.y);
          ctx.strokeStyle = 'rgba(212, 248, 42, 0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          const forwardLen = 60 + aimState.powerNormalized * 140;
          const fx = px + Math.cos(aimState.angle) * forwardLen;
          const fy = py + Math.sin(aimState.angle) * forwardLen;

          if (Math.abs(curveModifier) > 0.05) {
            const curveOffset = curveModifier * 45;
            const ctrlX = px + Math.cos(aimState.angle) * (forwardLen * 0.5) - Math.sin(aimState.angle) * curveOffset;
            const ctrlY = py + Math.sin(aimState.angle) * (forwardLen * 0.5) + Math.cos(aimState.angle) * curveOffset;

            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.quadraticCurveTo(ctrlX, ctrlY, fx, fy);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(fx, fy);
            ctx.strokeStyle = '#d4f82a';
            ctx.lineWidth = 3.5;
            ctx.stroke();
          }

          ctx.fillStyle = '#d4f82a';
          ctx.beginPath();
          ctx.arc(fx, fy, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`${Math.round(aimState.powerNormalized * 100)}%`, fx + 10, fy - 6);

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    isSimulating,
    activeTurn,
    aimState,
    curveModifier,
    knockoutBanner,
    slowMoReplay,
    resetRoundPositions,
    onMatchComplete,
    triggerAiFlick,
    mode,
  ]);

  // Pointer Interaction Handlers for Slingshot Flick
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSimulating || matchWinner) return;
    if (mode === 'RANKED' && activeTurn !== 'player1') return;
    if (mode === 'ONLINE_ROOM' && activeTurn !== 'player1') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = DESK_WIDTH / rect.width;
    const scaleY = DESK_HEIGHT / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const currentPen = pensRef.current.find((p) => p.owner === activeTurn);
    if (!currentPen) return;

    // Trigger initial tactile touch haptic
    triggerHaptic('light');
    lastPowerBracketRef.current = 0;

    setAimState({
      isAiming: true,
      startPos: { x: clickX, y: clickY },
      currentPos: { x: clickX, y: clickY },
      powerNormalized: 0,
      angle: currentPen.angle,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aimState.isAiming) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = DESK_WIDTH / rect.width;
    const scaleY = DESK_HEIGHT / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const currentPen = pensRef.current.find((p) => p.owner === activeTurn);
    if (!currentPen) return;

    // Use relative drag if thumb flick pad is active or user started dragging far from pen
    const distToPen = distance(aimState.startPos, currentPen.pos);
    const isRelativeDrag = useVirtualFlickPad || distToPen > 110;

    const dx = isRelativeDrag ? currentX - aimState.startPos.x : currentX - currentPen.pos.x;
    const dy = isRelativeDrag ? currentY - aimState.startPos.y : currentY - currentPen.pos.y;
    const pullDist = Math.hypot(dx, dy);

    const maxPull = 140;
    const powerNormalized = Math.min(1.0, Math.max(0.08, pullDist / maxPull));
    const flickAngle = Math.atan2(-dy, -dx);

    // Tactile haptic click whenever crossing power brackets (25%, 50%, 75%, 100%)
    const bracket = Math.floor(powerNormalized * 4);
    if (bracket !== lastPowerBracketRef.current) {
      lastPowerBracketRef.current = bracket;
      triggerHaptic('powerTick');
    }

    setAimState((prev) => ({
      ...prev,
      currentPos: { x: currentX, y: currentY },
      powerNormalized,
      angle: flickAngle,
    }));
  };

  const handlePointerUp = () => {
    if (!aimState.isAiming) return;

    const currentPen = pensRef.current.find((p) => p.owner === activeTurn);
    if (currentPen && aimState.powerNormalized > 0.08) {
      executeFlick(
        currentPen.id,
        aimState.powerNormalized,
        aimState.angle,
        curveModifier,
        selectedFlickStyle
      );

      if (mode === 'ONLINE_ROOM' && onSendFlick) {
        onSendFlick(
          aimState.powerNormalized,
          aimState.angle,
          curveModifier,
          selectedFlickStyle.id
        );
      }
    }

    setAimState({
      isAiming: false,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
      powerNormalized: 0,
      angle: 0,
    });
  };

  // PC Mouse wheel to adjust curve/spin on the fly
  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setCurveModifier((prev) => {
      const next = e.deltaY < 0 ? Math.min(1.0, +(prev + 0.1).toFixed(1)) : Math.max(-1.0, +(prev - 0.1).toFixed(1));
      triggerHaptic('spin');
      return next;
    });
  };

  // PC Keyboard Shortcuts (1-6 for styles, Q/E for spin, Space for flick, R for rematch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPenChangeModal) return;

      if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key) - 1;
        if (FLICK_STYLES[idx] && playerProfile.unlockedFlickStyles.includes(FLICK_STYLES[idx].id)) {
          setSelectedFlickStyle(FLICK_STYLES[idx]);
          sounds.playClick();
        }
      } else if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        setCurveModifier((c) => {
          const next = Math.max(-1.0, +(c - 0.1).toFixed(1));
          triggerHaptic('spin');
          return next;
        });
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        setCurveModifier((c) => {
          const next = Math.min(1.0, +(c + 0.1).toFixed(1));
          triggerHaptic('spin');
          return next;
        });
      } else if (e.key === 'w' || e.key === 'W' || e.key === '0') {
        setCurveModifier(0);
        triggerHaptic('spin');
      } else if (e.key === 'r' || e.key === 'R') {
        if (matchWinner) {
          sounds.playClick();
          setMatchWinner(null);
          setRoundScore([0, 0]);
          setCurrentRound(1);
          resetRoundPositions();
        }
      } else if (e.key === ' ' && !isSimulating && !matchWinner) {
        if (mode === 'RANKED' && activeTurn !== 'player1') return;
        if (mode === 'ONLINE_ROOM' && activeTurn !== 'player1') return;
        const currentPen = pensRef.current.find((p) => p.owner === activeTurn);
        if (currentPen) {
          const power = aimState.isAiming && aimState.powerNormalized > 0.1 ? aimState.powerNormalized : 0.75;
          const angle = aimState.isAiming ? aimState.angle : currentPen.angle;
          executeFlick(currentPen.id, power, angle, curveModifier, selectedFlickStyle);
          if (mode === 'ONLINE_ROOM' && onSendFlick) {
            onSendFlick(power, angle, curveModifier, selectedFlickStyle.id);
          }
          setAimState({
            isAiming: false,
            startPos: { x: 0, y: 0 },
            currentPos: { x: 0, y: 0 },
            powerNormalized: 0,
            angle: 0,
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showPenChangeModal,
    matchWinner,
    isSimulating,
    activeTurn,
    curveModifier,
    selectedFlickStyle,
    playerProfile.unlockedFlickStyles,
    resetRoundPositions,
    executeFlick,
    aimState,
    mode,
    onSendFlick,
  ]);

  const p1Pen = pensRef.current.find((p) => p.id === 'pen_player1');
  const p2Pen = pensRef.current.find((p) => p.id === 'pen_player2');

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-3 touch-none select-none">
      {/* Mobile Compact Broadcast Scorebug (< 640px) */}
      <div className="sm:hidden w-full bg-[#0e121b] border-2 border-white p-2 mb-2 shadow-brutal-yellow">
        <div className="flex items-center justify-between gap-1.5">
          {/* Player 1 Mini */}
          <div className={`flex items-center gap-1.5 px-2 py-1 border transition-all ${
            activeTurn === 'player1' ? 'bg-[#ffe500]/20 border-[#ffe500] shadow-sm' : 'border-white/10'
          }`}>
            <span className="text-sm">{playerPlatform === 'mobile' ? '📱' : '🖥️'}</span>
            <div className="flex flex-col leading-none">
              <span className="font-broadcast text-xs font-black uppercase text-white truncate max-w-[85px]">
                {playerProfile.username}
              </span>
              <span className="font-mono text-[9px] text-[#ffe500] font-bold mt-0.5">
                {p1Pen?.stats.weightGrams}g
              </span>
            </div>
          </div>

          {/* Center Broadcast Score */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-black border border-white font-mono text-xl font-black text-white tabular-nums">
              <span className={roundScore[0] > roundScore[1] ? 'text-[#ffe500]' : 'text-slate-200'}>
                {roundScore[0]}
              </span>
              <span className="text-slate-500 text-sm">:</span>
              <span className={roundScore[1] > roundScore[0] ? 'text-red-400' : 'text-slate-200'}>
                {roundScore[1]}
              </span>
            </div>
            <span className="text-[8px] uppercase font-mono font-bold tracking-widest text-slate-400 mt-0.5">
              RND {currentRound}/3
            </span>
          </div>

          {/* Player 2 Mini */}
          <div className={`flex items-center gap-1.5 px-2 py-1 border text-right transition-all ${
            activeTurn === 'player2' ? 'bg-red-500/20 border-red-500 shadow-sm' : 'border-white/10'
          }`}>
            <div className="flex flex-col items-end leading-none">
              <span className="font-broadcast text-xs font-black uppercase text-white truncate max-w-[85px]">
                {opponentName}
              </span>
              <span className="font-mono text-[9px] text-red-300 font-bold mt-0.5">
                {p2Pen?.stats.weightGrams}g
              </span>
            </div>
            <span className="text-sm">{opponentPlatform === 'mobile' ? '📱' : '🖥️'}</span>
          </div>
        </div>
      </div>

      {/* Desktop Broadcast Scoreboard Header (>= 640px) */}
      <div className="hidden sm:flex w-full items-center justify-between bg-[#0e121b] border-4 border-white px-6 py-3 mb-3 shadow-brutal-yellow">
        {/* Player 1 Card */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#ffe500] border-2 border-black flex items-center justify-center text-xl shadow-brutal-black">
            🖋️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-broadcast text-xl font-black italic uppercase text-white tracking-wide">
                {playerProfile.username}
              </span>
              <span className="text-[10px] font-mono font-black uppercase text-black bg-[#ffe500] px-1.5 py-0.2 border border-black">
                DIV {playerProfile.division}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-black border border-white/30 text-slate-300 font-mono" title={`Platform: ${playerPlatform}`}>
                {playerPlatform === 'mobile' ? '📱 Mobile' : '🖥️ PC'}
              </span>
            </div>
            <div className="text-xs font-mono font-bold flex items-center gap-1.5 mt-0.5">
              <span className={activeTurn === 'player1' ? 'text-[#ffe500] font-black' : 'text-slate-300'}>
                {p1Pen?.name || 'Active Pen'}
              </span>
              <span className="px-1.5 py-0.2 bg-white/10 text-[#ffe500] border border-white/20 text-[10px]">
                {p1Pen?.stats.weightGrams}g
              </span>
              <span className="text-slate-400 text-[10px]">{p1Pen?.stats.densityGramsPerCm3} g/cm³</span>
            </div>
          </div>
        </div>

        {/* Center Match Score (Best of 3) */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 px-5 py-1 bg-black border-2 border-white font-mono text-3xl font-black text-white shadow-brutal-black tabular-nums">
            <span className={roundScore[0] > roundScore[1] ? 'text-[#ffe500]' : 'text-slate-200'}>
              {roundScore[0]}
            </span>
            <span className="text-slate-500 text-xl font-sans">:</span>
            <span className={roundScore[1] > roundScore[0] ? 'text-red-400' : 'text-slate-200'}>
              {roundScore[1]}
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mt-1">
            ROUND {currentRound} / 3 (FIRST TO 2)
          </span>
          {godModePower > 1.0 && (
            <span className="mt-1 px-2 py-0.5 bg-[#ffe500] text-black text-[9px] font-mono font-black border border-black shadow-sm">
              DEV GOD-MODE: {godModePower}X
            </span>
          )}
        </div>

        {/* Player 2 Card */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              {mode === 'BOT_BATTLE' ? (
                <span className="text-[10px] font-mono font-black uppercase text-black bg-[#ffe500] px-1.5 py-0.2 border border-black">
                  AI BOT // {botDifficulty}
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 bg-black border border-white/30 text-slate-300 font-mono" title={`Platform: ${opponentPlatform}`}>
                  {opponentPlatform === 'mobile' ? '📱 Mobile' : '🖥️ PC'}
                </span>
              )}
              <span className="font-broadcast text-xl font-black italic uppercase text-white tracking-wide">
                {opponentName}
              </span>
              <span className="text-lg">{opponentAvatar}</span>
            </div>
            <div className="text-xs font-mono font-bold flex items-center justify-end gap-1.5 mt-0.5">
              <span className={activeTurn === 'player2' ? 'text-red-400 font-black' : 'text-slate-300'}>
                {p2Pen?.name || 'Rival'}
              </span>
              <span className="px-1.5 py-0.2 bg-red-500/20 text-red-300 border border-red-500/40 text-[10px]">
                {p2Pen?.stats.weightGrams}g
              </span>
            </div>
          </div>
          <div className="w-11 h-11 bg-red-600 border-2 border-black flex items-center justify-center text-xl shadow-brutal-black">
            {mode === 'BOT_BATTLE' ? '🤖' : '🎯'}
          </div>
        </div>
      </div>

      {/* Main Canvas Arena Container */}
      <div className="relative w-full aspect-[840/520] bg-black border-3 sm:border-4 border-white shadow-brutal-white overflow-hidden touch-none select-none">
        <canvas
          ref={canvasRef}
          width={DESK_WIDTH}
          height={DESK_HEIGHT}
          className="w-full h-full cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleCanvasWheel}
        />

        {/* Slow-mo Replay & Knockout Banner Overlay */}
        {knockoutBanner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs pointer-events-none animate-fadeIn z-30">
            <div className="bg-[#ffe500] text-black border-4 border-black px-6 sm:px-8 py-3 shadow-brutal-black -rotate-2 flex flex-col items-center max-w-[90%] text-center">
              <div className="flex items-center gap-2 font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest mb-0.5">
                <Camera className="w-4 h-4" /> REPLAY FLASH // OUT OF BOUNDS
              </div>
              <h2 className="font-broadcast text-2xl sm:text-5xl font-black italic tracking-wider uppercase text-black">
                {knockoutBanner}
              </h2>
            </div>
            <p className="text-white font-mono text-[10px] sm:text-xs uppercase tracking-widest mt-4 bg-black px-3 py-1 border border-white">
              DESK PERIMETER KNOCKOUT · POINT AWARDED
            </p>
          </div>
        )}

        {/* Pass & Play Device Handover Modal */}
        {passPlayNotice && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 z-40">
            <div className="bg-[#0e121b] border-4 border-[#ffe500] p-6 max-w-sm w-full text-center shadow-brutal-yellow">
              <div className="w-14 h-14 bg-[#ffe500] text-black border-2 border-black mx-auto flex items-center justify-center mb-3 shadow-brutal-black text-2xl">
                📱
              </div>
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-[#ffe500] mb-1 block">
                PASS & PLAY TURN HANDOVER
              </span>
              <h3 className="font-broadcast text-3xl font-black italic uppercase text-white mb-2">
                PASS TO {passPlayNotice}!
              </h3>
              <p className="text-slate-300 text-xs mb-5">
                Hand device over to the rival fighter. Tap ready when poised to aim and strike.
              </p>
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  sounds.playClick();
                  setPassPlayNotice(null);
                }}
                className="w-full py-3 bg-[#ffe500] hover:bg-[#ebd300] text-black font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black shadow-brutal-white cursor-pointer active:scale-95 transition-transform"
              >
                I AM READY TO FLICK
              </button>
            </div>
          </div>
        )}

        {/* Virtual Thumb Flick Pad for Mobile Ergonomics */}
        {useVirtualFlickPad && !isSimulating && !matchWinner && activeTurn === 'player1' && (
          <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-20 pointer-events-none">
            <div className="border-2 border-dashed border-[#ffe500]/50 bg-black/40 backdrop-blur-xs px-3 py-2 flex flex-col items-center">
              <span className="text-[9px] font-mono font-black text-[#ffe500] uppercase tracking-wider">
                THUMB FLICK ZONE
              </span>
              <span className="text-[8px] font-mono text-slate-300">
                PULL BACK HERE TO AIM
              </span>
            </div>
          </div>
        )}

        {/* Match Finished Victory Modal */}
        {matchWinner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 z-40">
            <div className="bg-[#0e121b] border-4 border-[#ffe500] p-6 sm:p-8 max-w-md w-full text-center shadow-brutal-yellow">
              <div className="w-16 h-16 bg-[#ffe500] text-black border-2 border-black mx-auto flex items-center justify-center mb-3 shadow-brutal-black">
                <Award className="w-8 h-8" />
              </div>
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-[#ffe500] mb-1 block">
                MATCH SETTLED // BOUT COMPLETED
              </span>
              <h3 className="font-broadcast text-3xl sm:text-5xl font-black italic uppercase text-white mb-2">
                {matchWinner === 'player1' ? `${playerProfile.username} WINS!` : `${opponentName} WINS!`}
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm mb-6">
                {matchWinner === 'player1'
                  ? '+30 Paperclips secured! Progression XP saved to cloud profile.'
                  : 'Fell off the wood rim. Calibrate your flick angle for the rematch!'}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setMatchWinner(null);
                    setRoundScore([0, 0]);
                    setCurrentRound(1);
                    resetRoundPositions();
                  }}
                  className="w-full py-3 bg-[#ffe500] hover:bg-[#ebd300] text-black font-broadcast font-black text-sm uppercase tracking-wider border-2 border-black shadow-brutal-white cursor-pointer active:scale-95"
                >
                  Instant Rematch (Press R)
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    onExitMatch();
                  }}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-broadcast font-bold text-sm uppercase tracking-wider border-2 border-white/30 cursor-pointer active:scale-95"
                >
                  Return to Hub
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PC Keyboard Shortcuts HUD Bar (Desktop only) */}
      <div className="hidden lg:flex items-center justify-between w-full px-3 py-1.5 mt-2 bg-black/60 border border-white/10 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span><strong className="text-white bg-white/10 px-1 border border-white/20">1-6</strong> Technique Styles</span>
          <span><strong className="text-white bg-white/10 px-1 border border-white/20">Q / E</strong> Curve Left/Right</span>
          <span><strong className="text-white bg-white/10 px-1 border border-white/20">Scroll Wheel</strong> Spin</span>
          <span><strong className="text-white bg-white/10 px-1 border border-white/20">Space</strong> Flick</span>
          <span><strong className="text-white bg-white/10 px-1 border border-white/20">R</strong> Rematch</span>
        </div>
        <div className="flex items-center gap-2 text-[#ffe500]">
          <span>CROSSPLAY: {crossplay ? 'ENABLED' : 'SOLO'}</span>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 mt-3 bg-[#0e121b] border-2 border-white/20 p-3 sm:p-4 shadow-brutal-black">
        {/* Row 1 on mobile: Weapon Button & Pad Toggle */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2">
          {/* Quick Pen Changer Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowPenChangeModal(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-[#ffe500] hover:bg-[#ebd300] text-black font-broadcast font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black shadow-brutal-white active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Scale className="w-4 h-4" />
            <span>Weapon ({p1Pen?.stats.weightGrams}g)</span>
          </button>

          {/* Virtual Thumb Pad Toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              sounds.playClick();
              setUseVirtualFlickPad((p) => !p);
            }}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-2 text-xs font-mono font-bold tracking-tight cursor-pointer active:scale-95 transition-all ${
              useVirtualFlickPad
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                : 'bg-black text-slate-400 border-white/20 hover:text-white'
            }`}
            title="Toggle spacious thumb flick pad on desk"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thumb Pad:</span>
            <span>{useVirtualFlickPad ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Technique Styles Picker */}
        <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <span className="hidden xl:inline text-xs font-mono font-bold uppercase text-slate-400 mr-1 whitespace-nowrap">
            STYLE:
          </span>
          {FLICK_STYLES.map((style, idx) => {
            const isUnlocked = playerProfile.unlockedFlickStyles.includes(style.id);
            const isSelected = selectedFlickStyle.id === style.id;

            return (
              <button
                key={style.id}
                disabled={!isUnlocked}
                onClick={() => {
                  triggerHaptic('light');
                  sounds.playClick();
                  setSelectedFlickStyle(style);
                }}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-broadcast font-bold uppercase border-2 transition-all whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer active:scale-95 ${
                  !isUnlocked
                    ? 'opacity-35 bg-white/5 border-transparent text-slate-500 cursor-not-allowed'
                    : isSelected
                    ? 'bg-white text-black border-white shadow-brutal-yellow font-black'
                    : 'bg-black border-white/20 hover:border-white/40 text-slate-300'
                }`}
                title={
                  isUnlocked
                    ? style.description
                    : `Unlocks at Player Level ${style.levelRequired}`
                }
              >
                <span className="hidden sm:inline text-[9px] font-mono font-black text-slate-400 bg-white/10 px-1 border border-white/20 mr-0.5">
                  {idx + 1}
                </span>
                <Zap className="w-3 h-3" />
                {style.name}
              </button>
            );
          })}
        </div>

        {/* Trajectory Spin Controls (Quick Steppers + Slider) */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2">
          {/* Quick Curve Steppers for Mobile */}
          <div className="flex items-center gap-1 bg-black p-1 border border-white/20">
            <button
              onClick={() => {
                triggerHaptic('spin');
                sounds.playClick();
                setCurveModifier((c) => Math.max(-1.0, +(c - 0.25).toFixed(2)));
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/20 active:scale-95"
              title="Curve Left"
            >
              ↶
            </button>
            <button
              onClick={() => {
                triggerHaptic('spin');
                sounds.playClick();
                setCurveModifier(0);
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-[#ffe500] font-mono text-[10px] font-black border border-white/20 active:scale-95"
              title="Reset Spin"
            >
              0
            </button>
            <button
              onClick={() => {
                triggerHaptic('spin');
                sounds.playClick();
                setCurveModifier((c) => Math.min(1.0, +(c + 0.25).toFixed(2)));
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/20 active:scale-95"
              title="Curve Right"
            >
              ↷
            </button>
            <span className="font-mono text-xs text-[#ffe500] font-bold px-1.5 tabular-nums">
              {curveModifier > 0 ? `+${curveModifier}` : curveModifier}
            </span>
          </div>

          {/* Reset / Quit button */}
          <button
            onClick={() => {
              sounds.playClick();
              onExitMatch();
            }}
            className="px-3 sm:px-4 py-2 text-xs font-broadcast font-bold uppercase bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 transition-colors cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Change Pen Modal */}
      {showPenChangeModal && (
        <PenChangeModal
          currentPenId={playerProfile.equippedPenId}
          profile={playerProfile}
          onSelectPen={(penId) => {
            if (onEquipPen) onEquipPen(penId);
            setTimeout(() => resetRoundPositions(), 50);
          }}
          onClose={() => setShowPenChangeModal(false)}
        />
      )}
    </div>
  );
};
