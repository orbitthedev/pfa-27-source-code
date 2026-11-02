/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameView, PlayerProfile, Tournament, TournamentMatch } from './types/game';
import { awardMatchWin, unlockItemInProfile } from './utils/storage';
import { sounds } from './utils/audio';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import { SignInGate } from './components/SignInGate';
import { Navbar } from './components/Navbar';
import { HubDashboard } from './components/HubDashboard';
import { DeskArena } from './components/DeskArena';
import { TournamentBracketView } from './components/TournamentBracketView';
import { GeometryBoxStore } from './components/GeometryBoxStore';
import { PenLocker } from './components/PenLocker';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { AdminPanelModal } from './components/AdminPanelModal';

function MainAppContent() {
  const { user, profile, loading, signOutUser, updateProfileData, isAdminUser, godModePower } = useAuth();
  const [currentView, setCurrentView] = useState<GameView>('HUB');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Match setup state
  const [matchMode, setMatchMode] = useState<'RANKED' | 'TOURNAMENT' | 'PASS_PLAY' | 'ONLINE_ROOM'>('RANKED');
  const [activeOpponentName, setActiveOpponentName] = useState<string>('ApexStriker_X');
  const [activeOpponentAvatar, setActiveOpponentAvatar] = useState<string>('🎯');
  const [currentActiveTournament, setCurrentActiveTournament] = useState<Tournament | null>(null);
  const [currentActiveMatch, setCurrentActiveMatch] = useState<TournamentMatch | null>(null);

  // Online WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const [incomingOnlineFlick, setIncomingOnlineFlick] = useState<{
    power: number;
    angle: number;
    curve: number;
    styleId: string;
  } | null>(null);
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);

  // Handle WebSocket connection
  const initWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return wsRef.current;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('PFA 27 Live WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'OPPONENT_JOINED') {
          setActiveOpponentName(msg.opponentName || 'Online Rival');
          setActiveOpponentAvatar('⚡');
          setMatchMode('ONLINE_ROOM');
          setCurrentView('MATCH');
        } else if (msg.type === 'ROOM_JOINED') {
          setActiveOpponentName(msg.opponentName || 'Room Host');
          setActiveOpponentAvatar('👑');
          setMatchMode('ONLINE_ROOM');
          setCurrentView('MATCH');
        } else if (msg.type === 'OPPONENT_FLICKED') {
          setIncomingOnlineFlick({
            power: msg.power,
            angle: msg.angle,
            curve: msg.curve,
            styleId: msg.flickStyleId,
          });
        }
      } catch (e) {
        console.error('Socket message parse error', e);
      }
    };

    wsRef.current = socket;
    return socket;
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleQuickRanked = () => {
    setMatchMode('RANKED');
    const randomRivals = [
      { name: 'DeskTitan_44', avatar: '🌪️' },
      { name: 'SpinPhantom', avatar: '🌀' },
      { name: 'BicBanger_99', avatar: '💥' },
      { name: 'VelocityKid', avatar: '⚡' },
    ];
    const picked = randomRivals[Math.floor(Math.random() * randomRivals.length)];
    setActiveOpponentName(picked.name);
    setActiveOpponentAvatar(picked.avatar);
    setCurrentView('MATCH');
  };

  const handleStartPassAndPlay = () => {
    setMatchMode('PASS_PLAY');
    setActiveOpponentName('Player 2 (Local)');
    setActiveOpponentAvatar('🎮');
    setCurrentView('MATCH');
  };

  const handleStartTournamentMatch = (tournament: Tournament, match: TournamentMatch) => {
    setCurrentActiveTournament(tournament);
    setCurrentActiveMatch(match);
    setMatchMode('TOURNAMENT');
    const opponent = match.player1.isUser ? match.player2 : match.player1;
    setActiveOpponentName(opponent.name);
    setActiveOpponentAvatar(opponent.avatar);
    setCurrentView('MATCH');
  };

  const handleJoinOnlineRoom = (roomCode: string, isHost: boolean) => {
    if (!profile) return;
    const socket = initWebSocket();
    setOnlineRoomCode(roomCode);

    const checkAndSend = () => {
      if (socket.readyState === WebSocket.OPEN) {
        if (isHost) {
          socket.send(
            JSON.stringify({
              type: 'CREATE_ROOM',
              playerName: profile.username,
              penId: profile.equippedPenId,
            })
          );
        } else {
          socket.send(
            JSON.stringify({
              type: 'JOIN_ROOM',
              roomCode,
              playerName: profile.username,
              penId: profile.equippedPenId,
            })
          );
        }
      } else {
        setTimeout(checkAndSend, 100);
      }
    };
    checkAndSend();
  };

  const handleSendFlickOnline = (power: number, angle: number, curve: number, styleId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'FLICK_ACTION',
          power,
          angle,
          curve,
          flickStyleId: styleId,
        })
      );
    }
  };

  const handleMatchComplete = (winner: 'player1' | 'player2') => {
    if (!profile) return;
    const isVictory = winner === 'player1';

    // Award XP and Paperclips, sync to cloud
    updateProfileData((prev) => {
      const { updatedProfile } = awardMatchWin(
        prev,
        isVictory,
        matchMode === 'TOURNAMENT' ? 80 : 35
      );
      return updatedProfile;
    });

    if (isVictory) {
      sounds.playPaperclipReward();
    }

    if (matchMode === 'TOURNAMENT' && currentActiveTournament && currentActiveMatch) {
      const tourney = { ...currentActiveTournament };
      const matchIndex = tourney.matches.findIndex((m) => m.id === currentActiveMatch.id);
      if (matchIndex !== -1) {
        tourney.matches[matchIndex].status = 'COMPLETED';
        tourney.matches[matchIndex].winner = isVictory ? 1 : 2;
        tourney.matches[matchIndex].score = isVictory ? [2, 0] : [0, 2];

        if (isVictory && tourney.currentRound < 3) {
          tourney.currentRound += 1;
        }
      }
      setCurrentActiveTournament(tourney);
    }
  };

  const handleDeductClips = (amount: number) => {
    updateProfileData((prev) => ({
      ...prev,
      paperclips: Math.max(0, prev.paperclips - amount),
    }));
  };

  const handleItemUnlocked = (itemType: 'pen' | 'skin', itemId: string) => {
    updateProfileData((prev) => unlockItemInProfile(prev, itemType, itemId));
  };

  const handleEquipNow = (penId: string, skinId: string) => {
    updateProfileData((prev) => ({
      ...prev,
      equippedPenId: penId,
      equippedSkinId: skinId,
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] bg-graph-paper flex flex-col items-center justify-center text-white font-sans p-4">
        <div className="w-16 h-16 border-4 border-black border-t-[#ffe500] animate-spin mb-6 bg-white shadow-brutal-yellow" />
        <span className="font-broadcast text-4xl sm:text-5xl font-black italic tracking-wide text-white">
          PFA <span className="bg-[#ffe500] text-black px-2 py-0.5 border-2 border-black inline-block -rotate-1 shadow-brutal-white">27</span>
        </span>
        <p className="font-mono text-xs uppercase tracking-widest text-[#ffe500] mt-3">
          VERIFYING FIGHTER CREDENTIALS & SESSIONS...
        </p>
      </div>
    );
  }

  // Not signed in: Require sign in gate
  if (!user || !profile) {
    return <SignInGate />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-graph-paper text-neutral-100 flex flex-col font-sans selection:bg-[#ffe500] selection:text-black">
      {/* 3-Zone Top Bar Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        profile={profile}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        userEmail={user.email || undefined}
        userPhoto={user.photoURL}
        onSignOut={signOutUser}
        isAdminUser={isAdminUser}
        onOpenAdminPanel={() => setIsAdminModalOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {currentView === 'HUB' && (
          <HubDashboard
            profile={profile}
            onNavigate={(view) => setCurrentView(view)}
            onQuickRankedMatch={handleQuickRanked}
            onStartPassAndPlay={handleStartPassAndPlay}
          />
        )}

        {currentView === 'MATCH' && (
          <DeskArena
            mode={matchMode}
            playerProfile={profile}
            opponentName={activeOpponentName}
            opponentAvatar={activeOpponentAvatar}
            onMatchComplete={handleMatchComplete}
            onExitMatch={() => setCurrentView('HUB')}
            onEquipPen={(penId) =>
              updateProfileData((p) => ({ ...p, equippedPenId: penId }))
            }
            onSendFlick={handleSendFlickOnline}
            incomingOnlineFlick={incomingOnlineFlick}
            godModePower={godModePower}
          />
        )}

        {currentView === 'TOURNAMENT' && (
          <TournamentBracketView
            profile={profile}
            onStartTournamentMatch={handleStartTournamentMatch}
          />
        )}

        {currentView === 'GEOMETRY_STORE' && (
          <GeometryBoxStore
            profile={profile}
            onDeductClips={handleDeductClips}
            onItemUnlocked={handleItemUnlocked}
            onEquipNow={handleEquipNow}
          />
        )}

        {currentView === 'LOCKER' && (
          <PenLocker
            profile={profile}
            onEquipPen={(penId) =>
              updateProfileData((p) => ({ ...p, equippedPenId: penId }))
            }
            onEquipSkin={(skinId) =>
              updateProfileData((p) => ({ ...p, equippedSkinId: skinId }))
            }
            onEquipFlickStyle={(styleId) =>
              updateProfileData((p) => ({ ...p, equippedFlickStyleId: styleId }))
            }
          />
        )}

        {currentView === 'MULTIPLAYER' && (
          <MultiplayerLobby
            profile={profile}
            onJoinRoom={handleJoinOnlineRoom}
            onStartRankedMatch={handleQuickRanked}
          />
        )}

        {currentView === 'DIVISIONS' && (
          <MultiplayerLobby
            profile={profile}
            onJoinRoom={handleJoinOnlineRoom}
            onStartRankedMatch={handleQuickRanked}
          />
        )}
      </main>

      {/* Broadcast Footer */}
      <footer className="border-t-4 border-black py-4 px-6 bg-white text-black text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto w-full mb-4 shadow-brutal-yellow">
        <div className="flex items-center gap-2">
          <span className="font-broadcast text-2xl font-black italic tracking-wider text-black">
            PFA <span className="bg-[#ffe500] px-1 border border-black">27</span>
          </span>
          <span className="font-bold">· FIGHTER PASSPORT: {user.email}</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-700 font-bold">
          <span>CLOUD SYNC ACTIVE</span>
          <span>·</span>
          <span>SEASON 2027</span>
        </div>
      </footer>

      {/* Admin Developer Console Modal */}
      {isAdminModalOpen && (
        <AdminPanelModal onClose={() => setIsAdminModalOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
