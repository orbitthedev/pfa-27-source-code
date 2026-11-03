/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tournament, TournamentMatch, PlayerProfile } from '../types/game';
import { INITIAL_TOURNAMENTS } from '../data/initialData';
import { sounds } from '../utils/audio';
import { Trophy, Lock, Unlock, Play, AlertCircle } from 'lucide-react';

interface TournamentBracketViewProps {
  profile: PlayerProfile;
  onStartTournamentMatch: (tournament: Tournament, match: TournamentMatch) => void;
}

export const TournamentBracketView: React.FC<TournamentBracketViewProps> = ({
  profile,
  onStartTournamentMatch,
}) => {
  const [tournaments] = useState<Tournament[]>(() => {
    return INITIAL_TOURNAMENTS;
  });
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>(tournaments[0].id);
  const [passcodeInputs, setPasscodeInputs] = useState<Record<string, string>>({});
  const [unlockedClosed, setUnlockedClosed] = useState<Record<string, boolean>>({});
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [mobileRoundTab, setMobileRoundTab] = useState<number>(1);

  const selectedTourney =
    tournaments.find((t) => t.id === selectedTourneyId) || tournaments[0];

  const handleUnlockClosed = (t: Tournament) => {
    sounds.playClick();
    const input = (passcodeInputs[t.id] || '').trim().toUpperCase();
    if (input === t.passcode) {
      setUnlockedClosed((prev) => ({ ...prev, [t.id]: true }));
      setPasscodeError(null);
    } else {
      setPasscodeError('Invalid passcode! Hint: Try "PENCIL27"');
      setTimeout(() => setPasscodeError(null), 3000);
    }
  };

  // Find user's current pending match in selected tournament
  const userMatch = selectedTourney.matches.find(
    (m) =>
      m.round === selectedTourney.currentRound &&
      (m.player1.isUser || m.player2.isUser) &&
      m.status !== 'COMPLETED'
  );

  const qfMatches = selectedTourney.matches.filter((m) => m.round === 1);
  const sfMatches = selectedTourney.matches.filter((m) => m.round === 2);
  const finalMatches = selectedTourney.matches.filter((m) => m.round === 3);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 font-sans">
      {/* Tournament Selector Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white border-4 border-black p-6 shadow-brutal-yellow">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#ffe500] text-black font-mono font-black text-xs px-2 py-0.5 border border-black uppercase tracking-wider">
              OFFICIAL CIRCUIT CUPS
            </span>
            <span className="font-mono text-xs font-bold text-neutral-500 uppercase">
              KNOCKOUT BRACKET MATRIX
            </span>
          </div>
          <h2 className="font-broadcast text-4xl sm:text-5xl font-black italic tracking-wide text-black mt-2 leading-none">
            TOURNAMENT BRACKETS
          </h2>
          <p className="text-neutral-700 font-mono text-xs sm:text-sm mt-2">
            Developer-hosted classroom cups: open city qualifiers and closed invitationals with verified real-life pen physics.
          </p>
        </div>

        {/* Tournament Switcher Tabs */}
        <div className="flex flex-wrap gap-2">
          {tournaments.map((t) => {
            const isSelected = t.id === selectedTourneyId;
            const isLocked = t.requiresPasscode && !unlockedClosed[t.id];

            return (
              <button
                key={t.id}
                onClick={() => {
                  sounds.playClick();
                  setSelectedTourneyId(t.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 border-2 border-black font-broadcast font-black text-base uppercase tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#ffe500] text-black shadow-brutal-black -translate-x-0.5 -translate-y-0.5'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {t.type === 'CLOSED' ? (
                  isLocked ? (
                    <Lock className="w-4 h-4 text-black" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-600" />
                  )
                ) : (
                  <Trophy className="w-4 h-4 text-black" />
                )}
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Closed Passcode Lock Screen */}
      {selectedTourney.requiresPasscode && !unlockedClosed[selectedTourney.id] ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white border-4 border-black text-center max-w-lg mx-auto shadow-brutal-yellow">
          <div className="w-16 h-16 border-3 border-black bg-[#ffe500] flex items-center justify-center mb-4 shadow-brutal-black">
            <Lock className="w-8 h-8 text-black" />
          </div>
          <h3 className="font-broadcast text-4xl font-black italic text-black mb-2 leading-none">
            CLOSED INVITATIONAL
          </h3>
          <p className="font-mono text-xs text-neutral-600 mb-6">
            Access restricted to verified players. Enter the developer passkey to access bracket.
          </p>

          {passcodeError && (
            <div className="flex items-center gap-2 font-mono text-xs text-red-800 mb-4 bg-red-100 p-2.5 border-2 border-red-600 shadow-brutal-black">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{passcodeError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 w-full max-w-xs">
            <input
              type="text"
              placeholder="PASSCODE (PENCIL27)"
              value={passcodeInputs[selectedTourney.id] || ''}
              onChange={(e) =>
                setPasscodeInputs((prev) => ({ ...prev, [selectedTourney.id]: e.target.value }))
              }
              className="flex-1 bg-neutral-100 border-2 border-black p-2.5 font-mono text-sm text-black placeholder-neutral-500 uppercase tracking-widest focus:outline-none focus:bg-white"
            />
            <button
              onClick={() => handleUnlockClosed(selectedTourney)}
              className="px-4 py-2.5 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-lg uppercase tracking-wider border-2 border-black cursor-pointer shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Unlock
            </button>
          </div>

          {(profile.isAdmin || profile.role === 'ADMIN') && (
            <button
              onClick={() => {
                sounds.playPaperclipReward();
                setUnlockedClosed((prev) => ({ ...prev, [selectedTourney.id]: true }));
              }}
              className="mt-4 w-full max-w-xs py-2.5 bg-black hover:bg-neutral-800 text-[#ffe500] font-broadcast font-black text-base uppercase tracking-wider border-2 border-black shadow-brutal-black cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              ★ OVERRIDE & ENTER AS DEV ADMIN ★
            </button>
          )}
        </div>
      ) : (
        /* Visual Tournament Tree */
        <div className="space-y-6">
          {/* Active Tournament Details & CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border-4 border-black shadow-brutal-black">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-broadcast text-3xl font-black italic text-black">
                  {selectedTourney.name}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 bg-[#ffe500] text-black border border-black font-black uppercase">
                  {selectedTourney.type} CUP
                </span>
              </div>
              <p className="font-mono text-xs text-neutral-700 mt-1">
                TROPHY: <strong className="text-black font-black">{selectedTourney.trophyName}</strong> · GRAND REWARD: <strong className="text-black font-black bg-[#ffe500] px-1 border border-black">{selectedTourney.rewardClips} PAPERCLIPS</strong>
              </p>
            </div>

            {userMatch && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onStartTournamentMatch(selectedTourney, userMatch);
                }}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-xl uppercase tracking-wider border-3 border-black shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-5 h-5 fill-black" />
                PLAY ROUND {selectedTourney.currentRound} MATCH
              </button>
            )}
          </div>

          {/* Mobile Round Switcher (< md) */}
          <div className="md:hidden flex items-center justify-between gap-1 p-2 bg-neutral-100 border-2 border-black">
            <button
              onClick={() => {
                sounds.playClick();
                setMobileRoundTab(1);
              }}
              className={`flex-1 py-1.5 text-xs font-broadcast font-black uppercase border border-black transition-all ${
                mobileRoundTab === 1 ? 'bg-[#ffe500] text-black shadow-sm' : 'bg-white text-black'
              }`}
            >
              1: Quarterfinals
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setMobileRoundTab(2);
              }}
              className={`flex-1 py-1.5 text-xs font-broadcast font-black uppercase border border-black transition-all ${
                mobileRoundTab === 2 ? 'bg-[#ffe500] text-black shadow-sm' : 'bg-white text-black'
              }`}
            >
              2: Semifinals
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setMobileRoundTab(3);
              }}
              className={`flex-1 py-1.5 text-xs font-broadcast font-black uppercase border border-black transition-all ${
                mobileRoundTab === 3 ? 'bg-[#ffe500] text-black shadow-sm' : 'bg-white text-black'
              }`}
            >
              3: Grand Final
            </button>
          </div>

          {/* 3-Column Bracket Tree */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 sm:p-6 bg-white border-4 border-black shadow-brutal-yellow">
            {/* Column 1: Quarterfinals */}
            <div className={`space-y-4 ${mobileRoundTab === 1 ? 'block' : 'hidden md:block'}`}>
              <div className="font-mono text-xs font-black uppercase tracking-wider text-black pb-2 border-b-2 border-black flex justify-between">
                <span>QUARTER-FINALS</span>
                <span>8 COMBATANTS</span>
              </div>
              <div className="space-y-3">
                {qfMatches.map((match) => (
                  <div
                    key={match.id}
                    className={`p-3 border-2 transition-all ${
                      match.player1.isUser || match.player2.isUser
                        ? 'bg-[#ffe500] border-black shadow-brutal-black'
                        : 'bg-neutral-50 border-black shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs font-bold py-1">
                      <span className={match.player1.isUser ? 'text-black font-black underline' : 'text-neutral-900'}>
                        {match.player1.avatar} {match.player1.name}
                      </span>
                      <span className="font-black text-black tabular-nums border border-black bg-white px-1.5">
                        {match.score[0]}
                      </span>
                    </div>
                    <div className="border-t border-black/20 my-1" />
                    <div className="flex items-center justify-between font-mono text-xs font-bold py-1">
                      <span className={match.player2.isUser ? 'text-black font-black underline' : 'text-neutral-900'}>
                        {match.player2.avatar} {match.player2.name}
                      </span>
                      <span className="font-black text-black tabular-nums border border-black bg-white px-1.5">
                        {match.score[1]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Semi-Finals */}
            <div className={`space-y-4 ${mobileRoundTab === 2 ? 'block' : 'hidden md:block'}`}>
              <div className="font-mono text-xs font-black uppercase tracking-wider text-black pb-2 border-b-2 border-black flex justify-between">
                <span>SEMI-FINALS</span>
                <span>4 COMBATANTS</span>
              </div>
              <div className="space-y-4 pt-1 sm:pt-3">
                {sfMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-3 border-2 border-black bg-neutral-50 shadow-sm"
                  >
                    <div className="flex items-center justify-between font-mono text-xs font-bold py-1">
                      <span className="text-neutral-900">
                        {match.player1.name}
                      </span>
                      <span className="font-black text-black tabular-nums border border-black bg-white px-1.5">
                        {match.score[0]}
                      </span>
                    </div>
                    <div className="border-t border-black/20 my-1" />
                    <div className="flex items-center justify-between font-mono text-xs font-bold py-1">
                      <span className="text-neutral-900">
                        {match.player2.name}
                      </span>
                      <span className="font-black text-black tabular-nums border border-black bg-white px-1.5">
                        {match.score[1]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Grand Final */}
            <div className={`space-y-4 ${mobileRoundTab === 3 ? 'block' : 'hidden md:block'}`}>
              <div className="font-mono text-xs font-black uppercase tracking-wider text-black pb-2 border-b-2 border-black flex items-center justify-between">
                <span>GRAND FINAL</span>
                <Trophy className="w-4 h-4 text-black" />
              </div>
              <div className="pt-2 sm:pt-10">
                {finalMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-4 sm:p-6 bg-[#ffe500] border-4 border-black shadow-brutal-black text-center"
                  >
                    <Trophy className="w-10 h-10 text-black mx-auto mb-2" />
                    <div className="font-mono text-xs font-black uppercase tracking-widest text-black mb-3">
                      {selectedTourney.trophyName}
                    </div>
                    <div className="flex items-center justify-between font-broadcast text-lg sm:text-xl font-black italic text-black border-2 border-black bg-white p-2">
                      <span>{match.player1.name}</span>
                      <span className="bg-[#ffe500] px-1 border border-black">VS</span>
                      <span>{match.player2.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
