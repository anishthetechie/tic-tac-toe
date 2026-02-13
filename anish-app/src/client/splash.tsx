import './index.css';

import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { context } from '@devvit/web/client';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useShareGame } from './hooks/useShareGame';

export const Splash = () => {
  const { copyShareLink, loading } = useShareGame();

  function startGame(e: React.MouseEvent<HTMLButtonElement>) {
    requestExpandedMode(e.nativeEvent, 'game');
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-6 p-6">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="absolute inset-0 bg-[#e85d2c]/20 rounded-full blur-2xl scale-150" />
          <img
            className="relative object-contain w-24 h-24 drop-shadow-md"
            src="/snoo.png"
            alt="Snoo"
          />
        </div>

        <div className="flex flex-col items-center gap-2 text-center max-w-[300px]">
          <h1 className="text-2xl font-bold tracking-tight text-[#1c1917]">
            Hey {context.username ?? 'user'}
          </h1>
          <p className="text-[15px] leading-relaxed text-[#57534e]">
            Play two-player Tic-Tac-Toe against another Redditor anywhere in the world.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-[300px]">
        <button
          className="w-full h-12 rounded-2xl bg-[#e85d2c] text-white font-semibold text-[15px] shadow-[0_2px_0_rgba(0,0,0,0.15)] hover:bg-[#c94d1f] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          onClick={startGame}
        >
          Tap to Start
        </button>
        <button
          className="w-full h-11 rounded-2xl border-2 border-[#e5e2dd] bg-white/80 text-[#57534e] font-medium text-sm hover:bg-white hover:border-[#d6d3d1] hover:text-[#1c1917] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={copyShareLink}
          disabled={loading}
        >
          {loading ? 'Copying…' : 'Copy link to invite a friend'}
        </button>
      </div>

      <footer className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-4 text-[13px] text-[#78716c]">
        <button
          className="hover:text-[#1c1917] transition-colors cursor-pointer"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-[#d6d3d1]">·</span>
        <button
          className="hover:text-[#1c1917] transition-colors cursor-pointer"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
        <span className="text-[#d6d3d1]">·</span>
        <button
          className="hover:text-[#1c1917] transition-colors cursor-pointer"
          onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
        >
          Discord
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);

