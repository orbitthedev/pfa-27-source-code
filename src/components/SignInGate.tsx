/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { sounds } from '../utils/audio';
import { Shield, Trophy, Package, AlertCircle, ArrowRight } from 'lucide-react';

export const SignInGate: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    sounds.playClick();
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      sounds.playPaperclipReward();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Failed to sign in. Please verify popup permissions and try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0a0a0a] bg-graph-paper relative overflow-hidden font-sans">
      {/* Brutalist diagonal hazard stripes banner on top edge */}
      <div className="absolute top-0 left-0 right-0 h-3 bg-hazard-stripes" />

      {/* Main Terminal Dossier */}
      <div className="relative w-full max-w-xl bg-white border-4 border-black p-6 sm:p-10 shadow-brutal-yellow flex flex-col text-left">
        {/* Top Header Tag */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="bg-[#ffe500] text-black font-broadcast font-black text-xs px-2 py-0.5 border border-black uppercase tracking-wider">
              REGISTRATION TERMINAL
            </span>
            <span className="font-mono text-xs font-bold text-neutral-500 uppercase tracking-widest">
              DOC-ID: #PFA-2027
            </span>
          </div>
          <span className="font-mono text-xs font-black uppercase text-neutral-800">
            DIV-CIRCUIT V2.7
          </span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <div className="font-broadcast text-5xl sm:text-6xl font-black italic tracking-tighter text-black leading-none">
            PFA <span className="bg-[#ffe500] px-2 py-0.5 border-2 border-black inline-block -rotate-1 shadow-brutal-black">27</span>
          </div>
          <div className="font-mono text-xs font-black uppercase tracking-widest text-neutral-700 mt-2">
            PEN FIGHT ASSOCIATION // OFFICIAL FIGHTER PASSPORT
          </div>
          <p className="text-neutral-700 text-sm mt-3 font-medium leading-relaxed">
            Link your Google account to record division points, unlock real brand pen chassis (Bic, Pilot, Rotring), and sync your Paperclip vault.
          </p>
        </div>

        {/* Technical Specs 3-Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="border-2 border-black p-3 bg-neutral-50 shadow-brutal-black">
            <div className="flex items-center gap-1.5 text-black font-broadcast text-lg font-black italic uppercase">
              <Trophy className="w-4 h-4 text-black" />
              RANKED DIVS
            </div>
            <div className="text-xs text-neutral-600 font-mono mt-1">
              Divisions 10 to 1 with live Elo rankings.
            </div>
          </div>

          <div className="border-2 border-black p-3 bg-[#ffe500]/20 shadow-brutal-black">
            <div className="flex items-center gap-1.5 text-black font-broadcast text-lg font-black italic uppercase">
              <Package className="w-4 h-4 text-black" />
              GEOMETRY BOXES
            </div>
            <div className="text-xs text-neutral-600 font-mono mt-1">
              Loot drops, rare nib wraps & aerodynamic skins.
            </div>
          </div>

          <div className="border-2 border-black p-3 bg-neutral-50 shadow-brutal-black">
            <div className="flex items-center gap-1.5 text-black font-broadcast text-lg font-black italic uppercase">
              <Shield className="w-4 h-4 text-black" />
              REAL CALIBRATION
            </div>
            <div className="text-xs text-neutral-600 font-mono mt-1">
              Exact 5.8g to 23.5g verified real physics.
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-100 border-2 border-red-600 text-red-800 text-xs font-bold flex items-center gap-2 shadow-brutal-black">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          disabled={isSigningIn || loading}
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#ffe500] hover:bg-[#f2d700] text-black font-broadcast font-black text-xl uppercase tracking-wider border-3 border-black shadow-brutal-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Official Google G mark */}
          <div className="w-6 h-6 bg-white border border-black flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <span>{isSigningIn ? 'INITIALIZING PASSPORT...' : 'ENTER ARENA WITH GOOGLE'}</span>
          <ArrowRight className="w-5 h-5 ml-1" />
        </button>

        {/* Footer Fine Print */}
        <div className="mt-6 pt-4 border-t-2 border-black/20 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-neutral-500 gap-2">
          <span>FAIR PLAY REGULATIONS ENFORCED</span>
          <span>ONLINE TOURNAMENT CIRCUIT 2027</span>
        </div>
      </div>
    </div>
  );
};
