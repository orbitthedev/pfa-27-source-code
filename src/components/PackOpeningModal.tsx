/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GeometryBox, PenDefinition, PenSkin, Rarity } from '../types/game';
import { PENS_CATALOG } from '../data/initialData';
import { sounds } from '../utils/audio';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

interface PackOpeningModalProps {
  box: GeometryBox;
  onClose: () => void;
  onItemUnlocked: (itemType: 'pen' | 'skin', itemId: string) => void;
  onEquipNow: (penId: string, skinId: string) => void;
}

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({
  box,
  onClose,
  onItemUnlocked,
  onEquipNow,
}) => {
  const [phase, setPhase] = useState<'BOX_CLOSED' | 'OPENING' | 'WALKOUT_REVEAL'>('BOX_CLOSED');
  const [unlockedItem, setUnlockedItem] = useState<{
    pen: PenDefinition;
    skin: PenSkin;
    rarity: Rarity;
  } | null>(null);

  useEffect(() => {
    const rand = Math.random();
    let selectedRarity: Rarity = 'Common';
    const rates = box.dropRates;

    if (rand < rates.Icon) {
      selectedRarity = 'Icon';
    } else if (rand < rates.Icon + rates.Legendary) {
      selectedRarity = 'Legendary';
    } else if (rand < rates.Icon + rates.Legendary + rates.Epic) {
      selectedRarity = 'Epic';
    } else if (rand < rates.Icon + rates.Legendary + rates.Epic + rates.Rare) {
      selectedRarity = 'Rare';
    } else {
      selectedRarity = 'Common';
    }

    const allSkins: { pen: PenDefinition; skin: PenSkin }[] = [];
    for (const pen of PENS_CATALOG) {
      for (const skin of pen.availableSkins) {
        if (skin.rarity === selectedRarity) {
          allSkins.push({ pen, skin });
        }
      }
    }

    const fallbackPen = PENS_CATALOG[0];
    const drop = allSkins.length > 0
      ? allSkins[Math.floor(Math.random() * allSkins.length)]
      : { pen: fallbackPen, skin: fallbackPen.availableSkins[0] };

    setUnlockedItem({
      pen: drop.pen,
      skin: drop.skin,
      rarity: drop.skin.rarity,
    });
  }, [box]);

  const handleOpenBox = () => {
    setPhase('OPENING');
    sounds.playDeskImpact(0.8);

    setTimeout(() => {
      setPhase('WALKOUT_REVEAL');
      if (unlockedItem) {
        sounds.playPackOpening(unlockedItem.rarity);
        onItemUnlocked('skin', unlockedItem.skin.id);
        onItemUnlocked('pen', unlockedItem.pen.id);

        confetti({
          particleCount: unlockedItem.rarity === 'Icon' ? 140 : 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ffe500', '#000000', '#ffffff', '#38bdf8'],
        });
      }
    }, 1200);
  };

  const getRarityBadge = (rarity: Rarity) => {
    switch (rarity) {
      case 'Icon':
        return 'bg-[#ffe500] text-black border-2 border-black font-black shadow-brutal-black';
      case 'Legendary':
        return 'bg-purple-600 text-white border-2 border-black font-black shadow-brutal-black';
      case 'Epic':
        return 'bg-rose-600 text-white border-2 border-black font-black shadow-brutal-black';
      case 'Rare':
        return 'bg-sky-500 text-white border-2 border-black font-black shadow-brutal-black';
      default:
        return 'bg-neutral-800 text-white border-2 border-black font-bold';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fadeIn font-sans">
      <div className="relative w-full max-w-md bg-white border-4 border-black p-6 shadow-brutal-yellow flex flex-col items-center text-center">
        {/* Phase 1: Closed Box */}
        {phase === 'BOX_CLOSED' && (
          <div className="flex flex-col items-center w-full">
            <span className="bg-[#ffe500] text-black font-mono font-black text-xs px-2 py-0.5 border border-black uppercase tracking-wider mb-2">
              SEALED CONTRABAND TIN
            </span>
            <h3 className="font-broadcast text-4xl font-black italic tracking-wide text-black mb-4 leading-none">
              {box.name}
            </h3>

            {/* Geometry Box Image Preview */}
            <div className="w-56 h-56 border-3 border-black mb-5 shadow-brutal-black relative overflow-hidden bg-neutral-900">
              <img
                src={box.imagePath}
                alt={box.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fname = box.imagePath.split('/').pop() || '';
                  if (!target.src.includes('/images/' + fname)) {
                    target.src = `/images/${fname}`;
                  } else if (!target.src.includes('/src/assets/images/' + fname)) {
                    target.src = `/src/assets/images/${fname}`;
                  }
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[#ffe500] font-mono text-[10px] font-black uppercase py-1 border-t-2 border-black">
                {box.tier} SPECIFICATION
              </div>
            </div>

            <p className="font-mono text-xs text-neutral-600 max-w-sm mb-6 leading-relaxed">
              {box.description}
            </p>

            <button
              onClick={handleOpenBox}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-xl tracking-wider uppercase border-3 border-black shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              POP METAL LATCH & OPEN
            </button>
          </div>
        )}

        {/* Phase 2: Opening Animation */}
        {phase === 'OPENING' && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse w-full">
            <div className="w-20 h-20 border-4 border-black border-t-[#ffe500] animate-spin mb-6 bg-neutral-100" />
            <h3 className="font-broadcast text-4xl font-black italic tracking-widest text-black mb-2">
              UNSEALING TIN...
            </h3>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
              DRAFTING COMPASS ROTATING · VERIFYING GRAMS
            </p>
          </div>
        )}

        {/* Phase 3: Walkout Card Reveal */}
        {phase === 'WALKOUT_REVEAL' && unlockedItem && (
          <div className="flex flex-col items-center w-full animate-fadeIn">
            <span
              className={`font-mono text-xs uppercase tracking-widest px-3 py-1 mb-4 ${getRarityBadge(
                unlockedItem.rarity
              )}`}
            >
              ★ {unlockedItem.rarity} DROP UNLOCKED ★
            </span>

            {/* FC Style Pen Fight Walkout Card */}
            <div className="w-full max-w-xs p-5 bg-white border-4 border-black shadow-brutal-black relative mb-5 text-left">
              <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                <div>
                  <div className="font-broadcast text-4xl font-black text-black italic leading-none">
                    {Math.round(unlockedItem.pen.stats.powerMultiplier * 80)}
                  </div>
                  <div className="font-mono text-[9px] font-black uppercase tracking-wider text-neutral-600">
                    OVR IMPULSE
                  </div>
                </div>
                <span className="text-2xl">🖋️</span>
              </div>

              {/* Graphic pen render preview */}
              <div className="w-full h-16 my-2 bg-neutral-900 border-2 border-black flex items-center justify-center relative shadow-inner">
                <div
                  className="w-44 h-5 border border-black shadow-md"
                  style={{
                    backgroundColor: unlockedItem.skin.primaryColor,
                    borderColor: unlockedItem.skin.accentColor,
                  }}
                />
              </div>

              <div className="border-t-2 border-black pt-3">
                <h4 className="font-broadcast text-2xl font-black italic text-black leading-none">
                  {unlockedItem.skin.name}
                </h4>
                <p className="font-mono text-xs text-neutral-600 mt-0.5 mb-3">
                  Chassis: {unlockedItem.pen.name}
                </p>

                {/* Stat pills */}
                <div className="grid grid-cols-2 gap-2 font-mono text-xs font-bold">
                  <div className="flex justify-between border-2 border-black bg-neutral-50 px-2 py-1">
                    <span>WEIGHT</span>
                    <span className="font-black text-black">
                      {unlockedItem.pen.stats.weightGrams}g
                    </span>
                  </div>
                  <div className="flex justify-between border-2 border-black bg-[#ffe500]/30 px-2 py-1">
                    <span>DENSITY</span>
                    <span className="font-black text-black">
                      {unlockedItem.pen.stats.densityGramsPerCm3}g/cm³
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => {
                  sounds.playClick();
                  onEquipNow(unlockedItem.pen.id, unlockedItem.skin.id);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black shadow-brutal-black transition-all cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <Check className="w-4 h-4" />
                Equip Now
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white hover:bg-neutral-100 text-black font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black shadow-brutal-black transition-all cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5"
              >
                To Locker
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
