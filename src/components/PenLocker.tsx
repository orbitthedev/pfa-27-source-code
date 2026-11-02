/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerProfile } from '../types/game';
import { PENS_CATALOG, FLICK_STYLES } from '../data/initialData';
import { sounds } from '../utils/audio';
import { Check, Lock, Zap, Scale, Layers } from 'lucide-react';

interface PenLockerProps {
  profile: PlayerProfile;
  onEquipPen: (penId: string) => void;
  onEquipSkin: (skinId: string) => void;
  onEquipFlickStyle: (styleId: string) => void;
}

export const PenLocker: React.FC<PenLockerProps> = ({
  profile,
  onEquipPen,
  onEquipSkin,
  onEquipFlickStyle,
}) => {
  const [selectedPenId, setSelectedPenId] = useState<string>(profile.equippedPenId);
  const [activeTab, setActiveTab] = useState<'PENS' | 'FLICK_STYLES'>('PENS');

  const selectedPen =
    PENS_CATALOG.find((p) => p.id === selectedPenId) || PENS_CATALOG[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white border-4 border-black p-6 shadow-brutal-yellow">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#ffe500] text-black font-mono font-black text-xs px-2 py-0.5 border border-black uppercase tracking-wider">
              REAL BRAND ARSENAL // LOCKER
            </span>
            <span className="font-mono text-xs font-bold text-neutral-500 uppercase">
              CALIBRATED PHYSICS MATRIX
            </span>
          </div>
          <h2 className="font-broadcast text-4xl sm:text-5xl font-black italic tracking-wide text-black mt-2 leading-none">
            WEAPON ARMORY & STYLES
          </h2>
          <p className="text-neutral-700 font-mono text-xs sm:text-sm mt-2 max-w-2xl">
            Official real-world pen brands calibrated with exact verified weight (grams), material density (g/cm³), and barrel overhang torque.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('PENS');
            }}
            className={`px-4 py-2.5 font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black transition-all cursor-pointer ${
              activeTab === 'PENS'
                ? 'bg-[#ffe500] text-black shadow-brutal-black -translate-x-0.5 -translate-y-0.5'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Brands & Skins ({PENS_CATALOG.length})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('FLICK_STYLES');
            }}
            className={`px-4 py-2.5 font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black transition-all cursor-pointer ${
              activeTab === 'FLICK_STYLES'
                ? 'bg-[#ffe500] text-black shadow-brutal-black -translate-x-0.5 -translate-y-0.5'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Flick Styles ({profile.unlockedFlickStyles.length}/6)
          </button>
        </div>
      </div>

      {activeTab === 'PENS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pen Catalog List */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            <div className="font-mono text-xs font-black uppercase tracking-widest text-neutral-600 pb-1 flex justify-between">
              <span>SELECT BRAND MODEL:</span>
              <span>VERIFIED MASS</span>
            </div>

            {PENS_CATALOG.map((pen) => {
              const isUnlocked = profile.unlockedPens.includes(pen.id);
              const isEquipped = profile.equippedPenId === pen.id;
              const isSelected = selectedPenId === pen.id;

              return (
                <div
                  key={pen.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedPenId(pen.id);
                  }}
                  className={`p-3.5 border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-brutal-yellow'
                      : 'bg-white text-black border-black hover:bg-neutral-50 shadow-brutal-black'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 border-2 border-black flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: pen.baseColor }}
                    >
                      🖋️
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-broadcast text-xl font-black italic tracking-wide truncate ${isSelected ? 'text-white' : 'text-black'}`}>
                          {pen.name}
                        </span>
                        {isEquipped && (
                          <span className="px-1.5 py-0.2 bg-[#ffe500] text-black text-[9px] font-mono font-black uppercase border border-black shrink-0">
                            EQUIPPED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className={`font-black ${isSelected ? 'text-[#ffe500]' : 'text-black'}`}>
                          {pen.stats.weightGrams}g
                        </span>
                        <span className="opacity-40">·</span>
                        <span className="truncate opacity-80">{pen.brand}</span>
                      </div>
                    </div>
                  </div>

                  {!isUnlocked ? (
                    <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-neutral-500 bg-neutral-200 border border-neutral-400 px-2 py-0.5 shrink-0">
                      <Lock className="w-3 h-3" /> LVL {pen.requiredLevel}
                    </span>
                  ) : !isEquipped ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playClick();
                        onEquipPen(pen.id);
                      }}
                      className="px-3 py-1 bg-[#ffe500] hover:bg-[#f2d700] text-black border-2 border-black font-broadcast font-black text-xs uppercase tracking-wider cursor-pointer shadow-brutal-black"
                    >
                      Equip
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Selected Pen Showcase & Stats */}
          <div className="lg:col-span-7 bg-white border-4 border-black p-6 flex flex-col justify-between shadow-brutal-black">
            <div>
              {/* Top Details */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-[#ffe500] font-mono font-black text-[10px] px-2 py-0.5 uppercase tracking-wider">
                      {selectedPen.brand} · {selectedPen.modelName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-200 border border-black uppercase font-bold text-black">
                      {selectedPen.archetype}
                    </span>
                  </div>
                  <h3 className="font-broadcast text-4xl sm:text-5xl font-black italic tracking-wide text-black mt-2 leading-none">
                    {selectedPen.name}
                  </h3>
                  <p className="font-mono text-xs text-neutral-600 mt-1">{selectedPen.tagline}</p>
                </div>

                {profile.unlockedPens.includes(selectedPen.id) &&
                  profile.equippedPenId !== selectedPen.id && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onEquipPen(selectedPen.id);
                      }}
                      className="px-5 py-2.5 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black shadow-brutal-black transition-all cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5"
                    >
                      Equip Active Pen
                    </button>
                  )}
              </div>

              {/* Graphical Blueprint Preview */}
              <div className="w-full h-28 my-5 bg-neutral-900 border-2 border-black flex items-center justify-center relative overflow-hidden px-8 shadow-inner">
                <div
                  className="w-full max-w-sm h-7 relative border-2 border-black shadow-lg"
                  style={{
                    backgroundColor: selectedPen.baseColor,
                  }}
                >
                  <div
                    className="absolute right-8 top-0 bottom-0 w-16 border-l border-r border-black"
                    style={{ backgroundColor: selectedPen.gripColor }}
                  />
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 border border-black"
                    style={{ backgroundColor: selectedPen.tipColor }}
                  />
                  <div
                    className="absolute left-2 -top-2 w-16 h-2 border border-black"
                    style={{ backgroundColor: selectedPen.clipColor }}
                  />
                </div>
              </div>

              {/* Exact Real-World Verified Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-2 border-black p-4 bg-neutral-50 mb-6 font-mono">
                <div>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-neutral-600">
                    <Scale className="w-3 h-3 text-black" /> REAL MASS
                  </div>
                  <div className="text-2xl font-black text-black tabular-nums mt-0.5">
                    {selectedPen.stats.weightGrams}<span className="text-xs font-bold">g</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {selectedPen.stats.weightGrams >= 20 ? 'Solid Heavyweight' : selectedPen.stats.weightGrams <= 8 ? 'Hyper Velocity' : 'Tourney Balanced'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-neutral-600">
                    <Layers className="w-3 h-3 text-black" /> DENSITY
                  </div>
                  <div className="text-2xl font-black text-black tabular-nums mt-0.5">
                    {selectedPen.stats.densityGramsPerCm3}<span className="text-xs font-bold">g/cm³</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                    {selectedPen.barrelMaterial}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-600">DIMENSIONS</div>
                  <div className="text-sm font-black text-black tabular-nums mt-1.5">
                    {selectedPen.stats.realLifeLengthMm}×{selectedPen.stats.realLifeDiameterMm}mm
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Length × Diameter
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-600">IMPULSE EFFICIENCY</div>
                  <div className="text-2xl font-black text-black tabular-nums mt-0.5">
                    {Math.round(selectedPen.stats.powerMultiplier * 100)}%
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Launch Output
                  </div>
                </div>
              </div>

              {/* Available Skins for this Real Brand */}
              <div>
                <div className="font-mono text-xs font-black uppercase tracking-wider text-neutral-700 mb-3 flex items-center justify-between">
                  <span>UNLOCKED CUSTOM SKINS:</span>
                  <span>GEOMETRY BOX VAULT DROPS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedPen.availableSkins.map((skin) => {
                    const isSkinUnlocked = profile.unlockedSkins.includes(skin.id);
                    const isSkinEquipped = profile.equippedSkinId === skin.id;

                    return (
                      <div
                        key={skin.id}
                        className={`p-3 border-2 flex flex-col justify-between transition-all ${
                          isSkinEquipped
                            ? 'bg-black text-white border-black shadow-brutal-yellow'
                            : 'bg-neutral-50 text-black border-black shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[9px] font-black uppercase px-1 py-0.2 border border-black bg-[#ffe500] text-black">
                              {skin.rarity}
                            </span>
                            <div
                              className="w-4 h-4 border border-black"
                              style={{ backgroundColor: skin.accentColor }}
                            />
                          </div>
                          <div className="font-broadcast text-lg font-black italic tracking-wide">
                            {skin.name}
                          </div>
                        </div>

                        <div className="mt-3">
                          {isSkinEquipped ? (
                            <span className="flex items-center gap-1 font-mono text-xs font-black text-[#ffe500]">
                              <Check className="w-3.5 h-3.5" /> EQUIPPED
                            </span>
                          ) : isSkinUnlocked ? (
                            <button
                              onClick={() => {
                                sounds.playClick();
                                onEquipSkin(skin.id);
                              }}
                              className="w-full py-1.5 bg-[#ffe500] hover:bg-[#f2d700] text-black border-2 border-black font-broadcast font-black text-xs uppercase tracking-wider cursor-pointer shadow-brutal-black"
                            >
                              Apply Skin
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-500 font-bold">
                              <Lock className="w-3 h-3" /> GEOMETRY BOX
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Flicking Styles Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FLICK_STYLES.map((style) => {
            const isUnlocked = profile.unlockedFlickStyles.includes(style.id);
            const isEquipped = profile.equippedFlickStyleId === style.id;

            return (
              <div
                key={style.id}
                className={`p-5 border-4 transition-all flex flex-col justify-between ${
                  isEquipped
                    ? 'bg-black text-white border-black shadow-brutal-yellow'
                    : 'bg-white text-black border-black shadow-brutal-black'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 border-b-2 border-current pb-2">
                    <div className="w-8 h-8 bg-[#ffe500] border-2 border-black flex items-center justify-center text-black font-black">
                      <Zap className="w-4 h-4" />
                    </div>
                    {isEquipped ? (
                      <span className="px-2 py-0.5 bg-[#ffe500] text-black font-mono text-[10px] font-black uppercase border border-black">
                        ACTIVE TECHNIQUE
                      </span>
                    ) : !isUnlocked ? (
                      <span className="flex items-center gap-1 font-mono text-xs font-bold text-neutral-500 bg-neutral-200 px-2 py-0.5 border border-neutral-400">
                        <Lock className="w-3.5 h-3.5" /> UNLOCKS LVL {style.levelRequired}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-broadcast text-2xl sm:text-3xl font-black italic tracking-wide mb-1 leading-none">
                    {style.name}
                  </h3>
                  <p className="font-mono text-xs opacity-75 mb-4">{style.description}</p>

                  <div className="space-y-2 border-t-2 border-current pt-3 font-mono text-xs font-bold">
                    <div className="flex justify-between">
                      <span>POWER MULTIPLIER</span>
                      <span className="font-black text-[#ffe500] bg-black px-1 border border-neutral-700">
                        +{Math.round((style.powerBonus - 1) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>CURVE & TORQUE</span>
                      <span className="font-black text-[#ffe500] bg-black px-1 border border-neutral-700">
                        +{Math.round((style.spinBonus - 1) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {isUnlocked && !isEquipped && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onEquipFlickStyle(style.id);
                      }}
                      className="w-full py-3 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black cursor-pointer shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5"
                    >
                      Equip Technique
                    </button>
                  )}
                  {isEquipped && (
                    <div className="text-center font-mono text-xs font-black uppercase text-[#ffe500] py-2 bg-neutral-900 border border-neutral-700">
                      CURRENTLY IN USE
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="text-center font-mono text-xs text-neutral-500 py-2">
                      Reach Level {style.levelRequired} to Unlock
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
