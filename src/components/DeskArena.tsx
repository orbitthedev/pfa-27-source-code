/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PenEntity, DeskObstacle, PlayerProfile, FlickStyle, PenDefinition } from '../types/game';
import { PENS_CATALOG, FLICK_STYLES } from '../data/initialData';
import { stepPhysics, DeskBounds, distance, normalize } from '../physics/penPhysics';
import { sounds } from '../utils/audio';
import { PenChangeModal } from './PenChangeModal';
import { RotateCcw, Zap, Compass, ShieldAlert, Award, Camera, Scale, RefreshCw } from 'lucide-react';

interface DeskArenaProps {
  mode: 'RANKED' | 'TOURNAMENT' | 'PASS_PLAY' | 'ONLINE_ROOM';
  playerProfile: PlayerProfile;
  opponentName?: string;
  opponentAvatar?: string;
  onMatchComplete: (winner: 'player1' | 'player2') => void;
  onExitMatch: () => void;
  onEquipPen?: (penId: string) => void;
  onSendFlick?: (power: number, angle: number, curve: number, styleId: string) => void;
  incomingOnlineFlick?: { power: number; angle: number; curve: number; styleId: string } | null;
  godModePower?: number;
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
  opponentName = 'RivalStriker_X',
  opponentAvatar = '🎯',
  onMatchComplete,
  onExitMatch,
  onEquipPen,
  onSendFlick,
  incomingOnlineFlick,
  godModePower = 1.0,
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

    // Pick opponent pen based on mode (e.g. Parker Jotter or Rotring 600)
    const oppPenDef = PENS_CATALOG[4] || PENS_CATALOG[1];
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
        owner: mode === 'PASS_PLAY' ? 'player2' : 'ai',
        name: oppPenDef.name,
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
  }, [playerProfile, mode]);

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

  // AI Opponent move calculation
  const triggerAiFlick = useCallback(() => {
    const aiPen = pensRef.current.find((p) => p.id === 'pen_player2');
    const playerPen = pensRef.current.find((p) => p.id === 'pen_player1');
    if (!aiPen || !playerPen || aiPen.isKnockedOut || playerPen.isKnockedOut) return;

    const dx = playerPen.pos.x - aiPen.pos.x;
    const dy = playerPen.pos.y - aiPen.pos.y;
    let targetAngle = Math.atan2(dy, dx);

    targetAngle += (Math.random() - 0.5) * 0.12;

    const dist = Math.hypot(dx, dy);
    // Adjusted power scaling for real pen weight
    let power = Math.min(1.0, Math.max(0.4, (dist / 400) * (aiPen.stats.mass / 1.1)));

    const nearEdge =
      playerPen.pos.x < TABLE_BOUNDS.x + 80 ||
      playerPen.pos.x > TABLE_BOUNDS.x + TABLE_BOUNDS.width - 80 ||
      playerPen.pos.y < TABLE_BOUNDS.y + 80 ||
      playerPen.pos.y > TABLE_BOUNDS.y + TABLE_BOUNDS.height - 80;

    if (nearEdge) power = Math.min(1.0, power * 1.2);

    const aiCurve = (Math.random() - 0.5) * 0.3;
    const aiStyle = FLICK_STYLES[0];

    executeFlick('pen_player2', power, targetAngle, aiCurve, aiStyle);
  }, [executeFlick]);

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
        }

        const p1 = pensRef.current.find((p) => p.id === 'pen_player1');
        const p2 = pensRef.current.find((p) => p.id === 'pen_player2');

        const p1Out = p1?.isKnockedOut;
        const p2Out = p2?.isKnockedOut;

        if (p1Out || p2Out) {
          if (!knockoutBanner) {
            sounds.playKnockout();
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
              if (nextTurn === 'player2' && mode !== 'PASS_PLAY' && mode !== 'ONLINE_ROOM') {
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

    const dx = currentX - currentPen.pos.x;
    const dy = currentY - currentPen.pos.y;
    const pullDist = Math.hypot(dx, dy);

    const maxPull = 140;
    const powerNormalized = Math.min(1.0, Math.max(0.1, pullDist / maxPull));
    const flickAngle = Math.atan2(-dy, -dx);

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

  const p1Pen = pensRef.current.find((p) => p.id === 'pen_player1');
  const p2Pen = pensRef.current.find((p) => p.id === 'pen_player2');

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-3">
      {/* Brutalist Broadcast Scoreboard Header */}
      <div className="w-full flex items-center justify-between bg-[#0e121b] border-4 border-white px-6 py-3.5 mb-4 shadow-brutal-yellow">
        {/* Player 1 Card with Real Pen Brand & Grams */}
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
          <div className="flex items-center gap-3 px-5 py-1.5 bg-black border-2 border-white font-mono text-3xl font-black text-white shadow-brutal-black tabular-nums">
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
            🎯
          </div>
        </div>
      </div>

      {/* Main Canvas Arena Container */}
      <div className="relative w-full aspect-[840/520] bg-black border-4 border-white shadow-brutal-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={DESK_WIDTH}
          height={DESK_HEIGHT}
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Slow-mo Replay & Knockout Banner Overlay */}
        {knockoutBanner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs pointer-events-none animate-fadeIn">
            <div className="bg-[#ffe500] text-black border-4 border-black px-8 py-3 shadow-brutal-black -rotate-2 flex flex-col items-center">
              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-widest mb-0.5">
                <Camera className="w-4 h-4" /> REPLAY FLASH // OUT OF BOUNDS
              </div>
              <h2 className="font-broadcast text-3xl sm:text-5xl font-black italic tracking-wider uppercase text-black">
                {knockoutBanner}
              </h2>
            </div>
            <p className="text-white font-mono text-xs uppercase tracking-widest mt-4 bg-black px-3 py-1 border border-white">
              DESK PERIMETER KNOCKOUT · POINT AWARDED
            </p>
          </div>
        )}

        {/* Match Finished Victory Modal */}
        {matchWinner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 z-20">
            <div className="bg-[#0e121b] border-4 border-[#ffe500] p-8 max-w-md w-full text-center shadow-brutal-yellow">
              <div className="w-16 h-16 bg-[#ffe500] text-black border-2 border-black mx-auto flex items-center justify-center mb-3 shadow-brutal-black">
                <Award className="w-8 h-8" />
              </div>
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-[#ffe500] mb-1 block">
                MATCH SETTLED // BOUT COMPLETED
              </span>
              <h3 className="font-broadcast text-4xl sm:text-5xl font-black italic uppercase text-white mb-2">
                {matchWinner === 'player1' ? `${playerProfile.username} WINS!` : `${opponentName} WINS!`}
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm mb-6">
                {matchWinner === 'player1'
                  ? '+30 Paperclips secured! Progression XP saved to cloud profile.'
                  : 'Fell off the wood rim. Calibrate your flick angle for the rematch!'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setMatchWinner(null);
                    setRoundScore([0, 0]);
                    setCurrentRound(1);
                    resetRoundPositions();
                  }}
                  className="flex-1 py-3 bg-[#ffe500] hover:bg-[#ebd300] text-black font-broadcast font-black text-sm uppercase tracking-wider border-2 border-black shadow-brutal-white cursor-pointer"
                >
                  Instant Rematch
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    onExitMatch();
                  }}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-broadcast font-bold text-sm uppercase tracking-wider border-2 border-white/30 cursor-pointer"
                >
                  Return to Hub
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls Bar: Flick Style Selector & Quick Change Pen Menu Button */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 mt-4 bg-[#0e121b] border-2 border-white/20 p-4 shadow-brutal-black">
        {/* Quick Pen Changer Button */}
        <button
          onClick={() => {
            sounds.playClick();
            setShowPenChangeModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ffe500] hover:bg-[#ebd300] text-black font-broadcast font-black text-sm uppercase tracking-wider border-2 border-black shadow-brutal-white transition-transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Scale className="w-4 h-4" />
          <span>Change Weapon ({p1Pen?.stats.weightGrams}g)</span>
        </button>

        {/* Flick Style Picker */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono font-bold uppercase text-slate-400 whitespace-nowrap shrink-0 mr-1">
            TECHNIQUE:
          </span>
          {FLICK_STYLES.map((style) => {
            const isUnlocked = playerProfile.unlockedFlickStyles.includes(style.id);
            const isSelected = selectedFlickStyle.id === style.id;

            return (
              <button
                key={style.id}
                disabled={!isUnlocked}
                onClick={() => {
                  sounds.playClick();
                  setSelectedFlickStyle(style);
                }}
                className={`px-3 py-1.5 text-xs font-broadcast font-bold uppercase rounded-none border-2 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
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
                <Zap className="w-3 h-3" />
                {style.name}
              </button>
            );
          })}
        </div>

        {/* Trajectory Curve Modifier */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black px-3 py-1.5 border border-white/20">
            <Compass className="w-4 h-4 text-[#ffe500]" />
            <label className="text-xs text-slate-300 font-mono font-bold whitespace-nowrap shrink-0">
              SPIN:
            </label>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={curveModifier}
              onChange={(e) => setCurveModifier(parseFloat(e.target.value))}
              className="w-20 accent-[#ffe500] cursor-pointer"
            />
            <span className="font-mono text-xs text-[#ffe500] font-bold w-7 tabular-nums">
              {curveModifier > 0 ? `+${curveModifier}` : curveModifier}
            </span>
          </div>

          {/* Reset / Quit button */}
          <button
            onClick={() => {
              sounds.playClick();
              onExitMatch();
            }}
            className="px-4 py-2 text-xs font-broadcast font-bold uppercase bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Leave Match
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
