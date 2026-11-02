/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameView, PlayerProfile } from '../types/game';
import { sounds } from '../utils/audio';
import { Volume2, VolumeX, Flame, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentView: GameView;
  onNavigate: (view: GameView) => void;
  profile: PlayerProfile;
  isMuted: boolean;
  onToggleMute: () => void;
  userEmail?: string;
  userPhoto?: string | null;
  onSignOut?: () => void;
  isAdminUser?: boolean;
  onOpenAdminPanel?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  profile,
  isMuted,
  onToggleMute,
  userEmail,
  userPhoto,
  onSignOut,
  isAdminUser,
  onOpenAdminPanel,
}) => {
  const navItems: { view: GameView; label: string }[] = [
    { view: 'HUB', label: 'Match Center' },
    { view: 'TOURNAMENT', label: 'Tournaments' },
    { view: 'GEOMETRY_STORE', label: 'Geometry Vault' },
    { view: 'LOCKER', label: 'Pen Armory' },
    { view: 'DIVISIONS', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-5 py-3 bg-[#0a0d14] border-b-2 border-white/15 text-slate-100 shadow-md">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => {
          sounds.playClick();
          onNavigate('HUB');
        }}
        className="flex items-center gap-3 group text-left cursor-pointer focus-visible:outline-none"
      >
        <div className="flex items-center gap-1.5 bg-[#ffe500] text-black px-2.5 py-1 -rotate-2 shadow-brutal-black font-broadcast text-2xl font-black italic tracking-tighter whitespace-nowrap shrink-0 group-hover:rotate-0 transition-transform">
          <span>PFA</span>
          <span className="bg-black text-[#ffe500] px-1 ml-0.5 not-italic">27</span>
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#ffe500] leading-none">
            PEN FIGHT 27
          </span>
          <span className="text-[9px] font-mono tracking-wider text-slate-400 leading-tight">
            UNDERGROUND CIRCUIT
          </span>
        </div>
      </button>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-2 text-xs font-broadcast font-bold uppercase tracking-wider">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                sounds.playClick();
                onNavigate(item.view);
              }}
              className={`px-3 py-1.5 transition-all whitespace-nowrap shrink-0 border-2 cursor-pointer ${
                isActive
                  ? 'bg-[#ffe500] text-black border-black font-black shadow-brutal-white -translate-y-0.5'
                  : 'bg-white/5 border-transparent text-slate-300 hover:text-white hover:border-white/20'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action area */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Paperclips currency badge (Tactile Tally Box) */}
        <button
          onClick={() => {
            sounds.playClick();
            onNavigate('GEOMETRY_STORE');
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#121620] hover:bg-[#1a202c] border-2 border-white/20 hover:border-[#ffe500] rounded-none shadow-brutal-black transition-all cursor-pointer group"
          title="Paperclips Loot Bank"
        >
          <span className="text-base" role="img" aria-label="paperclip">📎</span>
          <span className="font-mono font-black text-sm text-[#ffe500] tabular-nums whitespace-nowrap shrink-0">
            {profile.paperclips}
          </span>
          <span className="hidden sm:inline text-[10px] uppercase font-mono tracking-wider text-slate-400 group-hover:text-white">
            CLIPS
          </span>
        </button>

        {/* Level & Division tag */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-black border-2 border-white/20 text-xs font-mono font-bold">
          <span className="text-slate-400">DIV</span>
          <span className="text-[#ffe500]">{profile.division}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">LVL</span>
          <span className="text-white">{profile.level}</span>
        </div>

        {/* Developer Admin Status Badge / Modal Trigger */}
        {(isAdminUser || profile.isAdmin || profile.role === 'ADMIN') && (
          <button
            onClick={() => {
              sounds.playClick();
              onOpenAdminPanel?.();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ffe500] hover:bg-[#f2d700] text-black border-2 border-black font-broadcast font-black text-xs uppercase tracking-wider shadow-brutal-white cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-all shrink-0"
            title="Open Developer Root Admin Console"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DEV ADMIN</span>
          </button>
        )}

        {/* Audio Mute Toggle */}
        <button
          onClick={() => {
            onToggleMute();
            sounds.playClick();
          }}
          className="p-2 text-slate-400 hover:text-white bg-black hover:bg-white/10 border-2 border-white/20 transition-colors cursor-pointer"
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#ffe500]" />}
        </button>

        {/* Player Account Passport */}
        {userEmail && onSignOut && (
          <div className="flex items-center gap-2 pl-2 border-l-2 border-white/15">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt="Player"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-7 h-7 border-2 border-[#ffe500] object-cover"
              />
            ) : (
              <div className="w-7 h-7 bg-[#ffe500] text-black border-2 border-black flex items-center justify-center font-black text-xs">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => {
                sounds.playClick();
                onSignOut();
              }}
              className="text-[11px] font-mono font-bold uppercase text-slate-400 hover:text-red-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Sign Out of Player Passport"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
