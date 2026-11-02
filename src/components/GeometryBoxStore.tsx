/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GeometryBox, PlayerProfile } from '../types/game';
import { GEOMETRY_BOXES } from '../data/initialData';
import { PackOpeningModal } from './PackOpeningModal';
import { sounds } from '../utils/audio';
import { Sparkles, HelpCircle } from 'lucide-react';

interface GeometryBoxStoreProps {
  profile: PlayerProfile;
  onDeductClips: (amount: number) => void;
  onItemUnlocked: (itemType: 'pen' | 'skin', itemId: string) => void;
  onEquipNow: (penId: string, skinId: string) => void;
}

export const GeometryBoxStore: React.FC<GeometryBoxStoreProps> = ({
  profile,
  onDeductClips,
  onItemUnlocked,
  onEquipNow,
}) => {
  const [activeBoxToOpen, setActiveBoxToOpen] = useState<GeometryBox | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePurchase = (box: GeometryBox) => {
    sounds.playClick();
    if (profile.paperclips < box.costPaperclips) {
      setErrorMessage(`Insufficient Paperclips! Win matches to earn ${box.costPaperclips - profile.paperclips} more clips.`);
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    onDeductClips(box.costPaperclips);
    setActiveBoxToOpen(box);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border-4 border-black p-6 shadow-brutal-yellow">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#ffe500] text-black font-mono font-black text-xs px-2 py-0.5 border border-black uppercase tracking-wider">
              PFA DESK VAULT // CONTRABAND
            </span>
            <span className="font-mono text-xs font-bold text-neutral-500 uppercase">
              TIN CRATES & AERODYNAMIC SKINS
            </span>
          </div>
          <h2 className="font-broadcast text-4xl sm:text-5xl font-black italic tracking-wide text-black mt-2 leading-none">
            GEOMETRY BOX VAULT
          </h2>
          <p className="text-neutral-700 font-mono text-xs sm:text-sm mt-2 max-w-xl">
            Crack open vintage tin school geometry boxes using tournament paperclips. Unbox rare pen bodies, radiant wraps, and championship nibs.
          </p>
        </div>

        {/* Paperclips Balance Tally */}
        <div className="flex items-center gap-3 bg-[#ffe500] border-3 border-black p-3.5 shadow-brutal-black shrink-0">
          <span className="text-3xl" role="img" aria-label="paperclip">📎</span>
          <div>
            <div className="font-mono text-[10px] font-black uppercase tracking-wider text-black">
              VAULT PAPERCLIPS
            </div>
            <div className="font-mono text-3xl font-black text-black tabular-nums leading-none mt-0.5">
              {profile.paperclips}
            </div>
          </div>
        </div>
      </div>

      {/* Error message toast */}
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-100 border-2 border-red-600 text-red-900 text-xs font-mono font-bold flex items-center gap-2 shadow-brutal-black">
          <HelpCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Boxes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {GEOMETRY_BOXES.map((box) => {
          const canAfford = profile.paperclips >= box.costPaperclips;

          return (
            <div
              key={box.id}
              className="flex flex-col bg-white border-4 border-black shadow-brutal-black hover:shadow-brutal-yellow transition-all group"
            >
              {/* Box Image / Presentation */}
              <div className="relative aspect-square w-full bg-neutral-900 border-b-3 border-black overflow-hidden">
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
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#ffe500] text-black font-mono text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-sm">
                  {box.tier}
                </div>
              </div>

              {/* Box Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-broadcast text-2xl font-black italic tracking-wide text-black group-hover:text-neutral-800 transition-colors leading-none">
                    {box.name}
                  </h3>
                  <p className="font-mono text-xs text-neutral-600 mt-2 line-clamp-2">
                    {box.description}
                  </p>

                  {/* Drop rate bars */}
                  <div className="mt-4 pt-3 border-t-2 border-black font-mono space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                      DROP PROBABILITIES:
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-800">Rare+ Tier</span>
                      <span className="text-black tabular-nums">
                        {Math.round((box.dropRates.Rare + box.dropRates.Epic + box.dropRates.Legendary + box.dropRates.Icon) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-black bg-[#ffe500] px-1 border border-black">Legendary / Icon</span>
                      <span className="text-black tabular-nums font-black">
                        {Math.round((box.dropRates.Legendary + box.dropRates.Icon) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Button */}
                <button
                  onClick={() => handlePurchase(box)}
                  className={`mt-5 w-full flex items-center justify-center gap-2 py-3 border-2 border-black font-broadcast font-black text-lg uppercase tracking-wider transition-all cursor-pointer ${
                    canAfford
                      ? 'bg-[#ffe500] hover:bg-[#f2d700] text-black shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5'
                      : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>CRACK OPEN ({box.costPaperclips} CLIPS)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pack Opening Modal */}
      {activeBoxToOpen && (
        <PackOpeningModal
          box={activeBoxToOpen}
          onClose={() => setActiveBoxToOpen(null)}
          onItemUnlocked={onItemUnlocked}
          onEquipNow={onEquipNow}
        />
      )}
    </div>
  );
};
