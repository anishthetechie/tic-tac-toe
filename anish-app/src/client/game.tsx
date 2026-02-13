import './index.css';

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useGame } from './hooks/useGame';
import { useShareGame } from './hooks/useShareGame';

export const App = () => {
  const { loading: leaderboardLoading, username, myWins, entries, recordWin } = useLeaderboard();
  const { loading: gameLoading, view, canPlay, isYouWinner, play, reset } = useGame();
  const { copyShareLink, loading: shareLoading } = useShareGame();

  useEffect(() => {
    if (!isYouWinner) return;
    void recordWin();
  }, [isYouWinner, recordWin]);

  const board = view?.board ?? Array(9).fill(null);
  const winner = view?.winner ?? null;
  const status = view?.status ?? 'waiting';
  const turn = view?.turn ?? 'X';

  const youRole = view?.you.role ?? 'spectator';
  const roleLabel =
    youRole === 'spectator'
      ? 'You are watching'
      : youRole === 'X'
        ? 'You are X'
        : 'You are O';

  const gameOver = status === 'won' || status === 'tie';

  const statusText = (() => {
    if (gameLoading || !view) return 'Connecting...';
    if (status === 'waiting') return 'Waiting for another player to join…';
    if (status === 'won') {
      const winnerName =
        winner && view.players[winner] ? `${view.players[winner]} (${winner})` : winner ?? 'Unknown';
      return `Winner: ${winnerName}`;
    }
    if (status === 'tie') return 'Tie game!';
    return `Turn: ${turn}`;
  })();

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-6 p-5 pb-20">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-[#e85d2c]/15 rounded-full blur-xl scale-150" />
          <img
            className="relative object-contain w-20 h-20 drop-shadow-sm"
            src="/snoo.png"
            alt="Snoo"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl font-bold tracking-tight text-[#1c1917]">
            Two-player Tic-Tac-Toe
          </h1>
          <p className="text-sm text-[#57534e]">Play live from anywhere in the world</p>
          <span
            className={
              youRole === 'spectator'
                ? 'text-xs font-medium text-[#78716c] bg-[#f5f5f4] px-2.5 py-1 rounded-full'
                : youRole === 'X'
                  ? 'text-xs font-semibold text-[#0284c7] bg-[#e0f2fe] px-2.5 py-1 rounded-full'
                  : 'text-xs font-semibold text-[#d97706] bg-[#fef3c7] px-2.5 py-1 rounded-full'
            }
          >
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="w-full max-w-[340px] flex flex-col items-center gap-4">
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="text-[15px] font-semibold text-[#1c1917] min-w-0 truncate">
            {statusText}
          </div>
          <div className="flex gap-2 shrink-0">
            {status === 'waiting' && (
              <button
                className="rounded-xl border-2 border-[#e85d2c] text-[#e85d2c] px-3 h-9 text-sm font-semibold hover:bg-[#fff7ed] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                onClick={copyShareLink}
                disabled={shareLoading}
              >
                {shareLoading ? 'Copying…' : 'Invite friend'}
              </button>
            )}
            <button
              className="rounded-xl border-2 border-[#e5e2dd] bg-white px-3 h-9 text-sm font-semibold text-[#57534e] hover:bg-[#fafaf9] active:scale-[0.98] transition-all cursor-pointer"
              onClick={reset}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 w-full p-3 rounded-2xl bg-white/60 shadow-[0_4px_20px_rgba(28,25,23,0.08)]">
          {board.map((cell, idx) => {
            const isPlayable =
              canPlay && !gameOver && cell === null;
            return (
              <button
                key={idx}
                onClick={() => play(idx)}
                className={[
                  'aspect-square rounded-xl flex items-center justify-center select-none transition-all',
                  'bg-white border-2 shadow-[0_2px_0_rgba(0,0,0,0.04)]',
                  isPlayable
                    ? 'border-[#e5e2dd] hover:border-[#d6d3d1] hover:bg-[#fafaf9] active:scale-[0.97] cursor-pointer'
                    : 'border-[#f5f5f4] cursor-default',
                ].join(' ')}
                aria-label={`Cell ${idx + 1}`}
              >
                <span
                  className={
                    cell === 'X'
                      ? 'text-4xl font-extrabold text-[#0ea5e9] drop-shadow-sm'
                      : cell === 'O'
                        ? 'text-4xl font-extrabold text-[#f59e0b] drop-shadow-sm'
                        : 'text-4xl font-extrabold text-transparent'
                  }
                >
                  {cell ?? ''}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[#78716c]">First to 3 in a row wins</p>
      </div>

      <div className="w-full max-w-[340px] rounded-2xl bg-white/80 shadow-[0_4px_20px_rgba(28,25,23,0.08)] p-4 border border-[#f5f5f4]/80">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-bold text-[#1c1917]">Leaderboard</div>
          <div className="text-xs text-[#57534e]">
            {leaderboardLoading
              ? 'Loading…'
              : username
                ? `${username}: ${myWins} win${myWins === 1 ? '' : 's'}`
                : ''}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {entries.length === 0 ? (
            <p className="text-xs text-[#78716c]">No wins recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {entries.map((e, idx) => (
                <li
                  key={e.username}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right tabular-nums text-[#78716c] font-medium">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-[#1c1917]">{e.username}</span>
                  </div>
                  <span className="tabular-nums font-semibold text-[#57534e]">
                    {e.wins} win{e.wins === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <button
        className="rounded-xl border-2 border-[#e5e2dd] bg-white px-5 h-10 text-sm font-semibold text-[#57534e] hover:bg-[#fafaf9] active:scale-[0.98] transition-all cursor-pointer"
        onClick={reset}
      >
        New game
      </button>

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
    <App />
  </StrictMode>
);
