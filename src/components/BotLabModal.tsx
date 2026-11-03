/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BotDifficulty, PlayerProfile } from '../types/game';
import { BOT_DIFFICULTIES, PENS_CATALOG, BotDifficultyConfig } from '../data/initialData';
import { sounds } from '../utils/audio';
import { triggerHaptic } from '../utils/device';
import { Bot, X, Play, ShieldAlert, Cpu, Sparkles, Scale, Info } from 'lucide-react';

interface BotLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onStartBotMatch: (difficulty: BotDifficulty, botPenId: string) => void;
}

export const BotLabModal: React.FC<BotLabModalProps> = ({
  isOpen,
  onClose,
  profile,
  onStartBotMatch,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('NORMAL');
  const [selectedBotPenId, setSelectedBotPenId] = useState<string>('pilot_g2');

  if (!isOpen) return null;

  const currentDiff =
    BOT_DIFFICULTIES.find((d) => d.id === selectedDifficulty) || BOT_DIFFICULTIES[2];
  const currentPen =
    PENS_CATALOG.find((p) => p.id === selectedBotPenId) || PENS_CATALOG[0];

  const handleStart = () => {
    sounds.playClick();
    triggerHaptic('medium');
    onStartBotMatch(selectedDifficulty, selectedBotPenId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0a0d14] border-4 border-white text-white shadow-brutal-yellow my-auto">
        {/* Slanted corner banner */}
        <div className="absolute -top-3 -right-3 bg-red-600 text-white font-broadcast font-black text-xs uppercase px-4 py-1 rotate-2 border-2 border-white shadow-brutal-black z-10">
          OFFLINE TRAINING ONLY
        </div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b-4 border-white bg-[#111624] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#ffe500] text-black border-2 border-black flex items-center justify-center shadow-brutal-black shrink-0">
              <Bot className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white font-mono font-black text-[10px] px-2 py-0.5 uppercase tracking-widest border border-white">
                  EXCLUSIVE BOT GAME MODE
                </span>
                <span className="font-mono text-[10px] text-slate-400 uppercase hidden sm:inline">
                  ISOLATED TESTING ENVIRONMENT
                </span>
              </div>
              <h2 className="font-broadcast text-3xl sm:text-4xl font-black italic uppercase text-white mt-1 leading-none">
                AI BOT SPARRING LAB
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-10 h-10 bg-white/10 hover:bg-red-600 text-white border-2 border-white flex items-center justify-center cursor-pointer transition-colors active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Warning Banner: Bots Restricted & Banned from Leaderboard */}
        <div className="bg-[#ffe500] text-black px-4 py-2 border-b-2 border-black flex items-center justify-between text-xs font-mono font-black">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-black shrink-0" />
            <span>FAIR PLAY ENFORCEMENT: ALL AI BOTS ARE EXCLUDED FROM THE MAIN LEADERBOARD.</span>
          </div>
          <span className="hidden md:inline bg-black text-[#ffe500] px-1.5 py-0.5 text-[10px]">
            ZERO BOT TAINT
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Step 1: Select AI Difficulty */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-black uppercase text-[#ffe500] tracking-widest">
                // 1. CALIBRATE BOT INTELLECT (SMARTER OR STUPIDER)
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                ACTIVE: <strong className="text-white">{currentDiff.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {BOT_DIFFICULTIES.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;

                return (
                  <button
                    key={diff.id}
                    onClick={() => {
                      sounds.playClick();
                      triggerHaptic('light');
                      setSelectedDifficulty(diff.id);
                      setSelectedBotPenId(diff.defaultPenId);
                    }}
                    className={`p-3 border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#ffe500] text-black border-black shadow-brutal-white -translate-y-1'
                        : 'bg-[#121622] text-white border-white/20 hover:border-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{diff.avatar}</span>
                        <span
                          className={`font-mono text-[9px] font-black px-1.5 py-0.5 uppercase border ${diff.badgeColor}`}
                        >
                          {diff.id}
                        </span>
                      </div>
                      <div
                        className={`font-broadcast text-lg font-black italic uppercase leading-tight ${
                          isSelected ? 'text-black' : 'text-white'
                        }`}
                      >
                        {diff.name.split(' (')[0]}
                      </div>
                      <div
                        className={`font-mono text-[10px] mt-0.5 ${
                          isSelected ? 'text-neutral-800' : 'text-slate-400'
                        }`}
                      >
                        {diff.subtitle}
                      </div>
                    </div>

                    <div
                      className={`font-sans text-[11px] mt-3 line-clamp-3 leading-snug ${
                        isSelected ? 'text-black' : 'text-slate-300'
                      }`}
                    >
                      {diff.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Bot's Pen Armament */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-black uppercase text-[#ffe500] tracking-widest">
                // 2. EQUIP BOT WEAPONRY (MASS & MATERIAL)
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                BOT WEIGHT: <strong className="text-[#ffe500]">{currentPen.stats.weightGrams}g</strong> ({currentPen.barrelMaterial})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PENS_CATALOG.map((pen) => {
                const isSelected = selectedBotPenId === pen.id;

                return (
                  <button
                    key={pen.id}
                    onClick={() => {
                      sounds.playClick();
                      triggerHaptic('light');
                      setSelectedBotPenId(pen.id);
                    }}
                    className={`p-3 border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black border-black shadow-brutal-yellow'
                        : 'bg-[#121622] text-white border-white/20 hover:border-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                        {pen.brand}
                      </span>
                      <span className="font-mono text-[10px] font-black bg-black text-[#ffe500] px-1 py-0.5">
                        {pen.stats.weightGrams}g
                      </span>
                    </div>
                    <div
                      className={`font-display font-black text-sm uppercase truncate ${
                        isSelected ? 'text-black' : 'text-white'
                      }`}
                    >
                      {pen.name}
                    </div>
                    <div
                      className={`font-sans text-[10px] mt-1 truncate ${
                        isSelected ? 'text-neutral-600' : 'text-slate-400'
                      }`}
                    >
                      {pen.archetype} · {pen.stats.material}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Sparring Configuration Summary */}
          <div className="p-4 bg-black border-2 border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ffe500] text-black border border-black flex items-center justify-center text-xl shrink-0">
                {currentDiff.avatar}
              </div>
              <div>
                <div className="text-xs text-slate-400">
                  CHALLENGER: <strong className="text-white">{profile.username}</strong> ({profile.equippedPenId.replace('_', ' ').toUpperCase()})
                </div>
                <div className="text-sm font-bold text-[#ffe500]">
                  VS AI {currentDiff.name.toUpperCase()} ({currentPen.name})
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Format: <strong className="text-white">Best of 3 Knockouts</strong> · Friction: <strong className="text-white">Calibrated Wood</strong>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-3 py-4 bg-[#ffe500] hover:bg-[#ebd300] text-black font-broadcast font-black text-xl uppercase tracking-wider border-3 border-black shadow-brutal-white transition-transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>LAUNCH AI BOT SPARRING MATCH</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-broadcast font-bold text-base uppercase border-2 border-white/30 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
