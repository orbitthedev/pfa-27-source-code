/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PenDefinition, PlayerProfile } from '../types/game';
import { PENS_CATALOG } from '../data/initialData';
import { sounds } from '../utils/audio';
import { Scale, Layers, Check, X, Zap, Lock } from 'lucide-react';

interface PenChangeModalProps {
  currentPenId: string;
  profile: PlayerProfile;
  onSelectPen: (penId: string) => void;
  onClose: () => void;
}

export const PenChangeModal: React.FC<PenChangeModalProps> = ({
  currentPenId,
  profile,
  onSelectPen,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(currentPenId);

  const selectedPen =
    PENS_CATALOG.find((p) => p.id === selectedId) || PENS_CATALOG[0];

  const handleEquip = (pen: PenDefinition) => {
    sounds.playClick();
    onSelectPen(pen.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6 animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white border-4 border-black shadow-brutal-yellow flex flex-col overflow-hidden text-black font-sans">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b-4 border-black bg-[#ffe500]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black text-[#ffe500] border-2 border-black flex items-center justify-center font-black">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="font-broadcast text-2xl sm:text-3xl font-black italic tracking-wide text-black leading-none">
                SELECT PEN CHASSIS // REAL WEAPON DOSSIER
              </div>
              <div className="font-mono text-[10px] sm:text-xs font-bold text-black uppercase tracking-wider mt-0.5">
                Authentic real-life mass (g) & density (g/cm³) calibrated for sub-step physics
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 text-black hover:text-white bg-white hover:bg-black border-2 border-black transition-colors cursor-pointer shadow-brutal-black"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 bg-neutral-100">
          {/* Left Column: Pen Brands List */}
          <div className="md:col-span-5 space-y-2 overflow-y-auto max-h-[58vh] pr-1">
            <div className="font-mono text-xs font-black uppercase tracking-widest text-neutral-600 pb-1 flex items-center justify-between">
              <span>REAL BRANDS CATALOG:</span>
              <span>{PENS_CATALOG.length} MODELS</span>
            </div>

            {PENS_CATALOG.map((pen) => {
              const isSelected = pen.id === selectedId;
              const isCurrentEquipped = pen.id === currentPenId;
              const isUnlocked = profile.unlockedPens.includes(pen.id);

              return (
                <div
                  key={pen.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedId(pen.id);
                  }}
                  className={`p-3 border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-brutal-yellow'
                      : 'bg-white text-black border-black hover:bg-neutral-50 shadow-brutal-black'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 border-2 border-black flex items-center justify-center text-base shrink-0 shadow-sm"
                      style={{ backgroundColor: pen.baseColor }}
                    >
                      🖋️
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-broadcast text-lg sm:text-xl font-black italic tracking-wide truncate ${isSelected ? 'text-white' : 'text-black'}`}>
                          {pen.name}
                        </span>
                        {isCurrentEquipped && (
                          <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 bg-[#ffe500] text-black border border-black shrink-0">
                            IN PLAY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className={`font-black ${isSelected ? 'text-[#ffe500]' : 'text-black'}`}>
                          {pen.stats.weightGrams}g
                        </span>
                        <span className="opacity-40">|</span>
                        <span className="truncate opacity-75">{pen.brand}</span>
                      </div>
                    </div>
                  </div>

                  {!isUnlocked && (
                    <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-neutral-500 bg-neutral-200 border border-neutral-400 px-1.5 py-0.5 shrink-0">
                      <Lock className="w-3 h-3" /> LVL {pen.requiredLevel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Pen Blueprint & Physics Breakdown */}
          <div className="md:col-span-7 bg-white border-3 border-black p-5 flex flex-col justify-between shadow-brutal-black">
            <div>
              {/* Brand Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-black">
                <div>
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest bg-[#ffe500] border border-black px-1.5 py-0.5 text-black">
                    OFFICIAL SPECIFICATION: {selectedPen.brand}
                  </span>
                  <h3 className="font-broadcast text-3xl sm:text-4xl font-black italic tracking-wide text-black mt-2 leading-none">
                    {selectedPen.name}
                  </h3>
                  <p className="font-mono text-xs text-neutral-600 mt-1">{selectedPen.tagline}</p>
                </div>

                <div className="text-right shrink-0 border-2 border-black p-2 bg-[#ffe500] shadow-brutal-black">
                  <div className="font-mono text-[9px] font-black uppercase text-black">VERIFIED MASS</div>
                  <div className="font-mono text-3xl font-black text-black tabular-nums leading-none mt-0.5">
                    {selectedPen.stats.weightGrams}<span className="text-sm font-bold">g</span>
                  </div>
                </div>
              </div>

              {/* Graphic Blueprint Preview */}
              <div className="w-full h-24 my-4 bg-neutral-900 border-2 border-black flex items-center justify-center relative px-6 shadow-inner">
                <div
                  className="w-full h-6 relative border-2 border-black shadow-lg"
                  style={{
                    backgroundColor: selectedPen.baseColor,
                  }}
                >
                  {/* Grip section */}
                  <div
                    className="absolute right-8 top-0 bottom-0 w-16 border-l border-r border-black"
                    style={{ backgroundColor: selectedPen.gripColor }}
                  />
                  {/* Nib / Tip */}
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 border border-black"
                    style={{ backgroundColor: selectedPen.tipColor }}
                  />
                  {/* Cap clip */}
                  <div
                    className="absolute left-2 -top-2 w-12 h-2 border border-black"
                    style={{ backgroundColor: selectedPen.clipColor }}
                  />
                </div>
              </div>

              {/* Physics Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4 font-mono">
                <div className="border-2 border-black p-2.5 bg-neutral-50 shadow-sm">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-neutral-600 mb-0.5">
                    <Layers className="w-3 h-3 text-black" />
                    DENSITY
                  </div>
                  <div className="text-base font-black text-black">
                    {selectedPen.stats.densityGramsPerCm3} <span className="text-[10px] font-normal">g/cm³</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                    {selectedPen.barrelMaterial}
                  </div>
                </div>

                <div className="border-2 border-black p-2.5 bg-neutral-50 shadow-sm">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-neutral-600 mb-0.5">
                    <Scale className="w-3 h-3 text-black" />
                    DIMENSIONS
                  </div>
                  <div className="text-base font-black text-black">
                    {selectedPen.stats.realLifeLengthMm}×{selectedPen.stats.realLifeDiameterMm} <span className="text-[10px] font-normal">mm</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    L × Barrel Dia
                  </div>
                </div>

                <div className="border-2 border-black p-2.5 bg-[#ffe500]/30 shadow-sm col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-neutral-800 mb-0.5">
                    <Zap className="w-3 h-3 text-black" />
                    CLASS
                  </div>
                  <div className="text-base font-black text-black truncate">
                    {selectedPen.archetype}
                  </div>
                  <div className="text-[10px] text-neutral-700 mt-0.5">
                    {selectedPen.stats.weightGrams >= 20 ? 'Max Knockout' : selectedPen.stats.weightGrams <= 8 ? 'Hyper Velocity' : 'Tourney Balanced'}
                  </div>
                </div>
              </div>

              {/* Tactical Physics Dossier */}
              <div className="p-3 border-2 border-black bg-neutral-100 text-xs font-mono">
                <span className="font-black text-black uppercase tracking-wider block mb-1">
                  TACTICAL DYNAMICS:
                </span>
                {selectedPen.stats.weightGrams <= 7 && (
                  <p className="text-neutral-700 leading-tight">
                    Ultra-light 5.8g polystyrene body. Finger snaps launch it with extreme velocity ($v = J/m$). Minimal inertia makes it susceptible to getting pushed off by heavyweights.
                  </p>
                )}
                {selectedPen.stats.weightGrams > 7 && selectedPen.stats.weightGrams <= 14 && (
                  <p className="text-neutral-700 leading-tight">
                    Tournament standard balance. {selectedPen.stats.weightGrams}g mass offers dependable friction grip on desk varnish with precise trajectory hold.
                  </p>
                )}
                {selectedPen.stats.weightGrams > 14 && selectedPen.stats.weightGrams < 20 && (
                  <p className="text-neutral-700 leading-tight">
                    Stainless steel clip assembly creates rearward center-of-mass bias. Eccentric flicks produce extreme spin torque for sweeping perimeter strikes.
                  </p>
                )}
                {selectedPen.stats.weightGrams >= 20 && (
                  <p className="text-neutral-700 leading-tight">
                    Solid brass heavyweight titan ({selectedPen.stats.weightGrams}g). Slower acceleration requires high release power, but kinetic momentum ($p = mv$) easily bulldozes opponents off the table edge.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="font-mono text-xs font-bold">
                {profile.unlockedPens.includes(selectedPen.id) ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> UNLOCKED IN LOCKER
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> UNLOCKS AT LEVEL {selectedPen.requiredLevel}
                  </span>
                )}
              </div>

              <button
                disabled={!profile.unlockedPens.includes(selectedPen.id) && selectedPen.id !== currentPenId}
                onClick={() => handleEquip(selectedPen)}
                className={`w-full sm:w-auto px-6 py-3 font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black transition-all cursor-pointer shadow-brutal-black ${
                  selectedPen.id === currentPenId
                    ? 'bg-neutral-300 text-neutral-700 cursor-default shadow-none'
                    : profile.unlockedPens.includes(selectedPen.id)
                    ? 'bg-[#ffe500] hover:bg-[#f2d700] text-black hover:translate-x-0.5 hover:translate-y-0.5'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                }`}
              >
                {selectedPen.id === currentPenId ? 'EQUIPPED IN MATCH' : 'DEPLOY THIS PEN'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
