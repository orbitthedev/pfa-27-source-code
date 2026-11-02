/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { PENS_CATALOG, FLICK_STYLES, ALL_PEN_IDS, ALL_SKIN_IDS, ALL_FLICK_STYLE_IDS } from '../data/initialData';
import { sounds } from '../utils/audio';
import { ShieldCheck, Zap, Package, Trophy, Sparkles, RefreshCw, X, Check, Flame } from 'lucide-react';

interface AdminPanelModalProps {
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const { user, profile, updateProfileData, godModePower, setGodModePower } = useAuth();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleMaxEverything = async () => {
    sounds.playPaperclipReward();
    await updateProfileData((prev) => ({
      ...prev,
      level: 99,
      xp: 999999,
      xpNextLevel: 1000000,
      paperclips: 999999,
      division: 1,
      divisionPoints: 100,
      totalWins: 777,
      totalMatches: 777,
      winStreak: 777,
      unlockedPens: ALL_PEN_IDS,
      unlockedSkins: ALL_SKIN_IDS,
      unlockedFlickStyles: ALL_FLICK_STYLE_IDS,
      role: 'ADMIN',
      isAdmin: true,
    }));
    showFeedback('SUCCESS: Account maxed with all pens, skins, styles & 999,999 clips!');
  };

  const handleRefillPaperclips = async (amount: number) => {
    sounds.playPaperclipReward();
    await updateProfileData((prev) => ({
      ...prev,
      paperclips: Math.min(999999, prev.paperclips + amount),
    }));
    showFeedback(`+${amount.toLocaleString()} Paperclips added to your vault!`);
  };

  const handleUnlockAllPens = async () => {
    sounds.playClick();
    await updateProfileData((prev) => ({
      ...prev,
      unlockedPens: ALL_PEN_IDS,
    }));
    showFeedback(`Unlocked all ${ALL_PEN_IDS.length} real brand pen chassis!`);
  };

  const handleUnlockAllSkins = async () => {
    sounds.playClick();
    await updateProfileData((prev) => ({
      ...prev,
      unlockedSkins: ALL_SKIN_IDS,
    }));
    showFeedback(`Unlocked all ${ALL_SKIN_IDS.length} Geometry Box skins!`);
  };

  const handleUnlockAllStyles = async () => {
    sounds.playClick();
    await updateProfileData((prev) => ({
      ...prev,
      unlockedFlickStyles: ALL_FLICK_STYLE_IDS,
    }));
    showFeedback(`Unlocked all ${ALL_FLICK_STYLE_IDS.length} finger flicking styles!`);
  };

  const handleResetToRookie = async () => {
    sounds.playClick();
    await updateProfileData((prev) => ({
      ...prev,
      level: 1,
      xp: 0,
      xpNextLevel: 100,
      paperclips: 240,
      division: 10,
      divisionPoints: 20,
      equippedPenId: 'bic_cristal',
      equippedSkinId: 'skin_bic_classic_blue',
      equippedFlickStyleId: 'style_classic_thumb',
      unlockedPens: ['bic_cristal', 'pilot_g2'],
      unlockedSkins: ['skin_bic_classic_blue'],
      unlockedFlickStyles: ['style_classic_thumb'],
      role: 'ADMIN',
      isAdmin: true,
    }));
    showFeedback('Profile reset to rookie state (Admin status preserved).');
  };

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fadeIn font-sans">
      <div className="relative w-full max-w-2xl bg-white border-4 border-black shadow-brutal-yellow flex flex-col text-black max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-[#ffe500]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black text-[#ffe500] border-2 border-black flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-broadcast text-3xl font-black italic tracking-wide text-black leading-none">
                DEVELOPER ROOT CONSOLE // ADMIN
              </div>
              <div className="font-mono text-xs font-bold text-neutral-800 uppercase mt-0.5">
                FULL GAME PRIVILEGES & INVENTORY OVERRIDE
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 text-black hover:text-white bg-white hover:bg-black border-2 border-black transition-colors cursor-pointer shadow-brutal-black"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-neutral-50 flex-1">
          {/* Status Badge Strip */}
          <div className="p-4 border-3 border-black bg-white shadow-brutal-black font-mono text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2">
              <span className="font-black uppercase text-neutral-700">AUTHENTICATED ROOT:</span>
              <span className="font-black bg-[#ffe500] px-2 py-0.5 border border-black text-black">
                {user?.email || 'samwdoesthings@gmail.com'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div>
                <span className="text-neutral-500 block text-[10px]">ROLE STATUS</span>
                <span className="font-black text-black text-sm">DEVELOPER ADMIN</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">CURRENT LEVEL</span>
                <span className="font-black text-black text-sm">LVL {profile.level}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">PAPERCLIPS</span>
                <span className="font-black text-black text-sm">{profile.paperclips.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">UNLOCKED PENS</span>
                <span className="font-black text-black text-sm">{profile.unlockedPens.length}/{PENS_CATALOG.length}</span>
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 font-mono text-xs font-bold flex items-center gap-2 shadow-brutal-black animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Primary Master Grant */}
          <div className="p-5 border-3 border-black bg-[#ffe500] shadow-brutal-black">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-black" />
              <h3 className="font-broadcast text-2xl sm:text-3xl font-black italic tracking-wide text-black leading-none">
                GRANT EVERYTHING (MASTER UNLOCK)
              </h3>
            </div>
            <p className="font-mono text-xs text-neutral-800 mb-4">
              Instantly unlocks all 9 authentic real pen brands, all 27 Geometry Box skins, all 6 flicking techniques, grants 999,999 paperclips, and elevates you to Division 1 (World Elite) at Level 99.
            </p>
            <button
              onClick={handleMaxEverything}
              className="w-full py-3.5 bg-black hover:bg-neutral-800 text-[#ffe500] font-broadcast font-black text-xl uppercase tracking-wider border-2 border-black shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              ★ ACTIVATE MASTER ALL-ACCESS PASS ★
            </button>
          </div>

          {/* Quick Item Granters */}
          <div>
            <div className="font-mono text-xs font-black uppercase tracking-wider text-black mb-3">
              INDIVIDUAL REPOSITORY CONTROLS:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleRefillPaperclips(100000)}
                className="p-3 border-2 border-black bg-white hover:bg-neutral-100 text-left font-mono shadow-brutal-black cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-1.5 font-broadcast text-xl font-black italic text-black">
                  <span>📎</span> +100,000 CLIPS
                </div>
                <div className="text-[10px] text-neutral-600 mt-1">
                  Add 100k paperclips to vault
                </div>
              </button>

              <button
                onClick={handleUnlockAllSkins}
                className="p-3 border-2 border-black bg-white hover:bg-neutral-100 text-left font-mono shadow-brutal-black cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-1.5 font-broadcast text-xl font-black italic text-black">
                  <Package className="w-4 h-4 text-black" /> ALL 27 SKINS
                </div>
                <div className="text-[10px] text-neutral-600 mt-1">
                  Unlock every geometry skin
                </div>
              </button>

              <button
                onClick={handleUnlockAllStyles}
                className="p-3 border-2 border-black bg-white hover:bg-neutral-100 text-left font-mono shadow-brutal-black cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-1.5 font-broadcast text-xl font-black italic text-black">
                  <Zap className="w-4 h-4 text-black" /> ALL 6 STYLES
                </div>
                <div className="text-[10px] text-neutral-600 mt-1">
                  Unlock Cannon, Whip & Hammer
                </div>
              </button>
            </div>
          </div>

          {/* God Mode Power Multiplier */}
          <div className="p-4 border-2 border-black bg-white shadow-brutal-black">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                <span className="font-broadcast text-xl font-black italic text-black">
                  DEV GOD-MODE FLICK POWER
                </span>
              </div>
              <span className="font-mono text-xs font-black bg-[#ffe500] px-2 py-0.5 border border-black">
                {godModePower}x MULTIPLIER
              </span>
            </div>
            <p className="font-mono text-[11px] text-neutral-600 mb-3">
              Supercharges finger flick impulses in matches for testing knockback physics and rim ejections.
            </p>
            <div className="flex items-center gap-2">
              {[1.0, 2.0, 3.5, 5.0].map((multiplier) => (
                <button
                  key={multiplier}
                  onClick={() => {
                    sounds.playClick();
                    setGodModePower(multiplier);
                    showFeedback(`God-mode power set to ${multiplier}x!`);
                  }}
                  className={`flex-1 py-1.5 font-mono text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
                    godModePower === multiplier
                      ? 'bg-black text-[#ffe500] shadow-brutal-black'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-black'
                  }`}
                >
                  {multiplier === 1.0 ? '1.0x (Normal)' : `${multiplier}x Power`}
                </button>
              ))}
            </div>
          </div>

          {/* Test & Debug Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t-2 border-black">
            <button
              onClick={handleResetToRookie}
              className="w-full sm:w-auto px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-mono text-xs font-bold border border-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset To Rookie Profile (For QA Test)
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 bg-black text-white font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black cursor-pointer shadow-brutal-black"
            >
              Done / Close Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
