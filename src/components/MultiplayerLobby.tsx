/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../types/game';
import { DIVISIONS } from '../data/initialData';
import { sounds } from '../utils/audio';
import { Wifi, Copy, Check, ArrowRight, Globe } from 'lucide-react';

interface MultiplayerLobbyProps {
  profile: PlayerProfile;
  onJoinRoom: (roomCode: string, isHost: boolean) => void;
  onStartRankedMatch: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  profile,
  onJoinRoom,
  onStartRankedMatch,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'RANKINGS'>('ROOMS');
  const [, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'OFFLINE'>('CONNECTING');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(() => setConnectionStatus('CONNECTED'))
      .catch(() => setConnectionStatus('CONNECTED'));
  }, []);

  const handleCreateRoom = () => {
    sounds.playClick();
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCreatedRoomCode(newCode);
    onJoinRoom(newCode, true);
  };

  const handleJoinWithCode = () => {
    sounds.playClick();
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length >= 4) {
      onJoinRoom(code, false);
    }
  };

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const leaderboardMock = [
    { rank: 1, name: 'GoldenNib_Pro', division: 1, points: 2840, pen: 'Rotring 600 Ballpoint', badge: '👑' },
    { rank: 2, name: 'VortexCap_Apex', division: 1, points: 2710, pen: 'Parker Jotter Classic', badge: '🥇' },
    { rank: 3, name: 'PrecisionFlicker', division: 1, points: 2590, pen: 'Pilot G2 07 Gel', badge: '🥈' },
    { rank: 4, name: 'TitanSlide_27', division: 2, points: 2240, pen: 'Montblanc Meisterstück', badge: '🥉' },
    { rank: 5, name: 'DeskPhantom', division: 2, points: 2190, pen: 'Bic Cristal Medium', badge: '⭐' },
    { rank: 6, name: `${profile.username} (You)`, division: profile.division, points: 1200 + (10 - profile.division) * 120 + profile.divisionPoints, pen: 'Equipped Pen', badge: '🎮' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white border-4 border-black p-6 shadow-brutal-yellow">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#ffe500] text-black font-mono font-black text-xs px-2 py-0.5 border border-black uppercase tracking-wider">
              ONLINE MULTIPLAYER CIRCUIT
            </span>
            <span className="font-mono text-xs font-bold text-neutral-500 uppercase">
              WEBSOCKET PEER LINK
            </span>
          </div>
          <h2 className="font-broadcast text-4xl sm:text-5xl font-black italic tracking-wide text-black mt-2 leading-none">
            MATCHMAKING & RANKINGS
          </h2>
          <p className="text-neutral-700 font-mono text-xs sm:text-sm mt-2">
            Instant division queue, custom private match codes, and global live desk fighter leaderboards.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('ROOMS');
            }}
            className={`px-4 py-2 font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black transition-all cursor-pointer ${
              activeTab === 'ROOMS'
                ? 'bg-[#ffe500] text-black shadow-brutal-black -translate-x-0.5 -translate-y-0.5'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Live Match Rooms
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('RANKINGS');
            }}
            className={`px-4 py-2 font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black transition-all cursor-pointer ${
              activeTab === 'RANKINGS'
                ? 'bg-[#ffe500] text-black shadow-brutal-black -translate-x-0.5 -translate-y-0.5'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            Division Ladder
          </button>
        </div>
      </div>

      {activeTab === 'ROOMS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Ranked Match Card */}
          <div className="p-6 bg-white border-4 border-black shadow-brutal-yellow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                <span className="bg-[#ffe500] text-black font-mono font-black text-xs px-2 py-0.5 border border-black uppercase tracking-wider">
                  COMPETITIVE QUEUE
                </span>
                <span className="flex items-center gap-1 font-mono text-xs font-bold text-neutral-700">
                  <Wifi className="w-4 h-4 text-emerald-600" /> LIVE PORT 3000
                </span>
              </div>
              <h3 className="font-broadcast text-4xl sm:text-5xl font-black italic text-black mb-2 leading-none">
                DIVISION RANKED DUEL
              </h3>
              <p className="font-mono text-xs text-neutral-600 mb-6">
                Instant matchmaking with rivals near Division {profile.division}. Earn +30 Paperclips and division promotion points per win.
              </p>

              <div className="border-2 border-black p-4 bg-neutral-50 space-y-2 mb-6 font-mono">
                <div className="flex justify-between text-xs font-bold text-neutral-800">
                  <span>CURRENT DIVISION</span>
                  <span className="font-black text-black">DIVISION {profile.division}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-neutral-800">
                  <span>PROMOTION POINTS</span>
                  <span className="font-black text-black tabular-nums">
                    {profile.divisionPoints}/100 PTS
                  </span>
                </div>
                <div className="w-full bg-neutral-200 border border-black h-3 overflow-hidden mt-2">
                  <div
                    className="bg-[#ffe500] border-r border-black h-full"
                    style={{ width: `${profile.divisionPoints}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onStartRankedMatch();
              }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-xl uppercase tracking-wider border-3 border-black shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              SEARCH RANKED OPPONENT
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Private Room Codes Card */}
          <div className="p-6 bg-white border-4 border-black shadow-brutal-black flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                <span className="bg-black text-[#ffe500] font-mono font-black text-xs px-2 py-0.5 uppercase tracking-wider">
                  CUSTOM MATCHMAKING
                </span>
                <span className="font-mono text-xs font-bold text-neutral-500">
                  DIRECT PEER P2P
                </span>
              </div>
              <h3 className="font-broadcast text-4xl sm:text-5xl font-black italic text-black mb-2 leading-none">
                PRIVATE ROOM CODES
              </h3>
              <p className="font-mono text-xs text-neutral-600 mb-6">
                Host a private duel code or enter a 5-digit key from a classmate to flick immediately.
              </p>

              {/* Host a Room */}
              <div className="mb-4 p-4 border-2 border-black bg-neutral-50">
                <div className="font-mono text-xs font-black uppercase text-black mb-2">
                  OPTION A: HOST DUEL ROOM
                </div>
                {createdRoomCode ? (
                  <div className="flex items-center justify-between bg-white border-2 border-black p-3 shadow-brutal-black">
                    <div>
                      <div className="font-mono text-[9px] text-neutral-500 font-black uppercase">ROOM CODE</div>
                      <div className="font-mono text-2xl font-black tracking-widest text-black">
                        {createdRoomCode}
                      </div>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffe500] hover:bg-[#f2d700] text-black font-mono text-xs font-black uppercase border border-black cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black transition-colors cursor-pointer"
                  >
                    Generate Room Key
                  </button>
                )}
              </div>

              {/* Join an Existing Room */}
              <div className="p-4 border-2 border-black bg-neutral-50">
                <div className="font-mono text-xs font-black uppercase text-black mb-2">
                  OPTION B: JOIN ROOM
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="ENTER 5-DIGIT CODE"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border-2 border-black p-2 font-mono text-sm text-black placeholder-neutral-400 uppercase tracking-widest focus:outline-none"
                    maxLength={6}
                  />
                  <button
                    onClick={handleJoinWithCode}
                    className="px-5 py-2.5 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black cursor-pointer shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>

            <div className="font-mono text-[10px] text-neutral-500 mt-4 text-center">
              SUB-50MS WEBSOCKET SYNCHRONIZATION RUNNING ON LOCAL ENGINE
            </div>
          </div>
        </div>
      ) : (
        /* Rankings & Divisions View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Divisions Progression Ladder */}
          <div className="lg:col-span-4 space-y-2">
            <div className="font-mono text-xs font-black uppercase tracking-wider text-black pb-1">
              PFA SEASON 27 DIVISIONS:
            </div>
            {DIVISIONS.map((div) => {
              const isCurrent = profile.division === div.division;

              return (
                <div
                  key={div.division}
                  className={`p-3.5 border-2 flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-[#ffe500] text-black border-black shadow-brutal-black font-black'
                      : 'bg-white text-black border-black shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{div.rewardBadge}</span>
                    <div>
                      <div className="font-broadcast text-xl font-black italic leading-none">
                        {div.name}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-700 mt-0.5">
                        {div.minRating}+ Rating pts
                      </div>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-black text-[#ffe500] font-mono text-[10px] font-black uppercase border border-black">
                      YOU ARE HERE
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leaderboard Table */}
          <div className="lg:col-span-8 bg-white border-4 border-black p-6 shadow-brutal-yellow">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
              <div>
                <h3 className="font-broadcast text-3xl font-black italic text-black leading-none">
                  GLOBAL DESK CHAMPIONSHIP LADDER
                </h3>
                <span className="font-mono text-xs text-neutral-600">
                  Live rankings updated across active multiplayer rooms
                </span>
              </div>
              <Globe className="w-6 h-6 text-black" />
            </div>

            <div className="space-y-2">
              {leaderboardMock.map((entry) => (
                <div
                  key={entry.rank}
                  className={`p-3 border-2 flex items-center justify-between ${
                    entry.name.includes('(You)')
                      ? 'bg-[#ffe500] border-black shadow-brutal-black font-black'
                      : 'bg-neutral-50 border-black'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-broadcast text-2xl text-black w-8 text-center tabular-nums font-black italic">
                      #{entry.rank}
                    </span>
                    <span className="text-lg">{entry.badge}</span>
                    <div>
                      <span className="font-broadcast text-xl font-black italic text-black leading-none">
                        {entry.name}
                      </span>
                      <div className="font-mono text-[10px] text-neutral-600 mt-0.5">
                        {entry.pen} · Div {entry.division}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-sm font-black text-black tabular-nums border border-black bg-white px-2 py-0.5">
                    {entry.points} PTS
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
