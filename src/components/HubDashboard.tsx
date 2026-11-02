/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameView, PlayerProfile } from '../types/game';
import { PENS_CATALOG, FLICK_STYLES } from '../data/initialData';
import { sounds } from '../utils/audio';
import { Play, Trophy, Package, Users, ArrowRight, Zap, Flame, Scale, Layers } from 'lucide-react';

interface HubDashboardProps {
  profile: PlayerProfile;
  onNavigate: (view: GameView) => void;
  onQuickRankedMatch: () => void;
  onStartPassAndPlay: () => void;
}

export const HubDashboard: React.FC<HubDashboardProps> = ({
  profile,
  onNavigate,
  onQuickRankedMatch,
  onStartPassAndPlay,
}) => {
  const equippedPen =
    PENS_CATALOG.find((p) => p.id === profile.equippedPenId) || PENS_CATALOG[0];
  const equippedSkin =
    equippedPen.availableSkins.find((s) => s.id === profile.equippedSkinId) ||
    equippedPen.availableSkins[0];
  const equippedStyle =
    FLICK_STYLES.find((s) => s.id === profile.equippedFlickStyleId) || FLICK_STYLES[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8 bg-graph-paper">
      {/* Ticker Tape Headline */}
      <div className="w-full bg-[#ffe500] text-black py-1.5 px-4 overflow-hidden border-2 border-black flex items-center justify-between font-broadcast font-black text-xs md:text-sm uppercase tracking-wider shadow-brutal-white">
        <span className="flex items-center gap-2">
          <span className="bg-black text-[#ffe500] px-1 py-0.5 text-[10px]">LIVE CIRCUIT</span>
          <span>NO SLEEP. JUST PURE WILL. THE DESK IS THE OCTAGON.</span>
        </span>
        <span className="hidden sm:inline font-mono text-xs">
          CALIBRATED PHYSICS: 5.8g BIC TO 23.5g ROTRING
        </span>
      </div>

      {/* Main Fight Banner */}
      <div className="relative w-full border-4 border-white bg-[#0e121b] shadow-brutal-yellow overflow-hidden">
        {/* Slanted corner flag */}
        <div className="absolute top-0 right-0 bg-[#ffe500] text-black font-broadcast font-black italic text-xs uppercase px-6 py-1 rotate-3 translate-x-3 -translate-y-1 z-20 border-2 border-black">
          ROUND 2027
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Visual Poster Column */}
          <div className="lg:col-span-7 relative min-h-[300px] sm:min-h-[360px] overflow-hidden border-b-4 lg:border-b-0 lg:border-r-4 border-white">
            <img
              src="/images/pfa27_cover_hero.jpg"
              alt="PFA 27 Match Key Art"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('pfa27_cover_hero_1793632077705.jpg')) {
                  target.src = '/src/assets/images/pfa27_cover_hero_1793632077705.jpg';
                }
              }}
              className="w-full h-full object-cover object-center filter contrast-125 brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="bg-red-600 text-white font-broadcast font-black text-xs uppercase tracking-widest px-2 py-0.5 inline-block mb-1">
                KNOCKOUT ARENA
              </span>
              <h2 className="font-broadcast text-4xl sm:text-5xl md:text-6xl font-black italic uppercase text-white leading-none drop-shadow-md">
                PEN FIGHT 27
              </h2>
            </div>
          </div>

          {/* Call to Arms Column */}
          <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-[#111622]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono font-bold uppercase text-[#ffe500] tracking-widest">
                  // COMPETITIVE LOADOUT
                </span>
              </div>

              <h1 className="font-broadcast text-3xl sm:text-4xl font-black italic uppercase text-white leading-tight mb-3">
                STEP UP TO THE DESK.
                <br />
                <span className="text-[#ffe500]">FLICK OR GET TOSSED.</span>
              </h1>

              <p className="text-slate-300 text-xs sm:text-sm font-sans mb-6 leading-relaxed">
                Authentic rigid-body impulse dynamics. Knuckle cannon shockwaves, 
                high-speed needle slides, and unforgiving desk rim knockouts.
              </p>

              {/* Active Pen Quick Specs */}
              <div className="p-3.5 bg-black border-2 border-white/20 mb-6">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                  ARMED & READY:
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-sm text-white">
                    {equippedPen.name}
                  </span>
                  <span className="font-mono font-black text-xs text-[#ffe500] bg-white/10 px-2 py-0.5">
                    {equippedPen.stats.weightGrams}g MASS
                  </span>
                </div>
                <div className="text-[11px] font-sans text-slate-400 mt-1">
                  Style: <strong className="text-white">{equippedStyle.name}</strong> · Skin: {equippedSkin.name}
                </div>
              </div>
            </div>

            {/* Match CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  sounds.playClick();
                  onQuickRankedMatch();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 bg-[#ffe500] hover:bg-[#ebd300] text-black font-broadcast font-black text-base uppercase tracking-wider border-2 border-black shadow-brutal-white transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Ranked Duel</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onStartPassAndPlay();
                }}
                className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white font-broadcast font-bold text-base uppercase tracking-wider border-2 border-white/30 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Pass & Play</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Brutalist Feature Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Box 1: Tournaments */}
        <div
          onClick={() => {
            sounds.playClick();
            onNavigate('TOURNAMENT');
          }}
          className="p-5 bg-[#121622] border-2 border-white/20 hover:border-[#ffe500] shadow-brutal-black transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-[#ffe500] text-black border-2 border-black flex items-center justify-center font-black">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-white/10 px-2 py-0.5 text-slate-300">
                BRACKET
              </span>
            </div>
            <h3 className="font-broadcast text-2xl font-black italic uppercase text-white group-hover:text-[#ffe500] transition-colors">
              Developer Cups
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-2">
              The 30cm Steel Ruler Open & Closed Secret Invitationals with passcode locks.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono font-bold text-[#ffe500]">
            <span>ENTER BRACKETS</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Box 2: Geometry Boxes */}
        <div
          onClick={() => {
            sounds.playClick();
            onNavigate('GEOMETRY_STORE');
          }}
          className="p-5 bg-[#121622] border-2 border-white/20 hover:border-[#ffe500] shadow-brutal-black transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-blue-500 text-black border-2 border-black flex items-center justify-center font-black">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-white/10 px-2 py-0.5 text-slate-300">
                CONTRABAND
              </span>
            </div>
            <h3 className="font-broadcast text-2xl font-black italic uppercase text-white group-hover:text-[#ffe500] transition-colors">
              Geometry Vault
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-2">
              Pop open wooden pencil boxes and tin math cases. Walkout unboxing animations.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono font-bold text-[#ffe500]">
            <span>{profile.paperclips} CLIPS STASHED</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Box 3: Pen Armory */}
        <div
          onClick={() => {
            sounds.playClick();
            onNavigate('LOCKER');
          }}
          className="p-5 bg-[#121622] border-2 border-white/20 hover:border-[#ffe500] shadow-brutal-black transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-emerald-400 text-black border-2 border-black flex items-center justify-center font-black">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-white/10 px-2 py-0.5 text-slate-300">
                HARDWARE
              </span>
            </div>
            <h3 className="font-broadcast text-2xl font-black italic uppercase text-white group-hover:text-[#ffe500] transition-colors">
              Pen Armory
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-2">
              Verified grams & densities: Bic (5.8g), Pilot (11.2g), Parker (15g), Rotring (23.5g).
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono font-bold text-[#ffe500]">
            <span>CHANGE LOADOUT</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Box 4: Online Matchmaking */}
        <div
          onClick={() => {
            sounds.playClick();
            onNavigate('MULTIPLAYER');
          }}
          className="p-5 bg-[#121622] border-2 border-white/20 hover:border-[#ffe500] shadow-brutal-black transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-purple-500 text-black border-2 border-black flex items-center justify-center font-black">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-white/10 px-2 py-0.5 text-slate-300">
                PVP
              </span>
            </div>
            <h3 className="font-broadcast text-2xl font-black italic uppercase text-white group-hover:text-[#ffe500] transition-colors">
              Online Matchmaking
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-2">
              Live WebSocket room duel codes, division promotions, and global leaderboard.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono font-bold text-[#ffe500]">
            <span>LOBBY & DUELS</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Player Fighter's License Strip */}
      <div className="p-6 bg-[#0a0d14] border-2 border-white/20 shadow-brutal-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#ffe500] text-black border-2 border-black flex items-center justify-center font-broadcast text-3xl font-black italic shadow-brutal-black">
            27
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-broadcast text-2xl font-black uppercase text-white">
                {profile.username}
              </span>
              <span className="bg-[#ffe500] text-black px-2 py-0.2 font-mono text-[10px] font-black uppercase">
                DIV {profile.division}
              </span>
              {(profile.isAdmin || profile.role === 'ADMIN') && (
                <span className="bg-red-600 text-white px-2 py-0.2 font-mono text-[10px] font-black uppercase border border-white shadow-sm">
                  ADMIN [ROOT]
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Active Weapon: <strong className="text-[#ffe500]">{equippedPen.name}</strong> ({equippedPen.stats.weightGrams}g, {equippedPen.stats.densityGramsPerCm3} g/cm³)
            </div>
          </div>
        </div>

        {/* Tally Numbers */}
        <div className="flex items-center gap-6 font-mono text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Wins</div>
            <div className="text-2xl font-black text-white tabular-nums">
              {profile.totalWins}
            </div>
          </div>
          <div className="border-l-2 border-white/20 pl-6">
            <div className="text-[10px] uppercase font-bold text-slate-400">Streak</div>
            <div className="text-2xl font-black text-[#ffe500] tabular-nums flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-[#ffe500]" />
              {profile.winStreak}
            </div>
          </div>
          <div className="border-l-2 border-white/20 pl-6">
            <div className="text-[10px] uppercase font-bold text-slate-400">Level</div>
            <div className="text-2xl font-black text-white tabular-nums">
              LVL {profile.level}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
