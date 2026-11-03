/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameView } from '../types/game';
import { sounds } from '../utils/audio';
import { triggerHaptic } from '../utils/device';
import { 
  Gamepad2, 
  Trophy, 
  Box, 
  PenTool, 
  BarChart3, 
  Smartphone,
  Laptop,
  Bot
} from 'lucide-react';

interface MobileNavDockProps {
  currentView: GameView;
  onNavigate: (view: GameView) => void;
  onOpenBotLab?: () => void;
  platform?: 'mobile' | 'desktop';
}

export const MobileNavDock: React.FC<MobileNavDockProps> = ({
  currentView,
  onNavigate,
  onOpenBotLab,
  platform = 'mobile',
}) => {
  const navItems: { view?: GameView; label: string; icon: React.ReactNode; isBotLab?: boolean }[] = [
    { 
      view: 'HUB', 
      label: 'Hub', 
      icon: <Gamepad2 className="w-5 h-5" /> 
    },
    { 
      view: 'TOURNAMENT', 
      label: 'Tourneys', 
      icon: <Trophy className="w-5 h-5" /> 
    },
    { 
      view: 'GEOMETRY_STORE', 
      label: 'Vault', 
      icon: <Box className="w-5 h-5" /> 
    },
    { 
      view: 'LOCKER', 
      label: 'Armory', 
      icon: <PenTool className="w-5 h-5" /> 
    },
    { 
      view: 'DIVISIONS', 
      label: 'Ranks', 
      icon: <BarChart3 className="w-5 h-5" /> 
    },
    { 
      label: 'Bot Lab', 
      icon: <Bot className="w-5 h-5 text-purple-400" />,
      isBotLab: true,
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0d14]/95 backdrop-blur-md border-t-2 border-white/20 px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl"
    >
      <div className="max-w-md mx-auto grid grid-cols-6 gap-1 items-center">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.label}
              onClick={() => {
                triggerHaptic('light');
                sounds.playClick();
                if (item.isBotLab) {
                  onOpenBotLab?.();
                } else if (item.view) {
                  onNavigate(item.view);
                }
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-1 min-h-[52px] border transition-all active:scale-95 cursor-pointer touch-manipulation ${
                isActive
                  ? 'bg-[#ffe500] text-black border-black font-black shadow-brutal-white -translate-y-0.5'
                  : 'bg-black/40 border-white/10 text-slate-300 hover:text-white hover:border-white/25'
              }`}
            >
              <div className={isActive ? 'text-black' : 'text-slate-300'}>
                {item.icon}
              </div>
              <span className="text-[10px] font-broadcast font-bold uppercase tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
