import { useCallback, useEffect, useState } from 'react';
import type { GameStatus, GameView } from '../../shared/api';

type GameHookState = {
  loading: boolean;
  error: string | null;
  view: GameView | null;
};

export function useGame() {
  const [state, setState] = useState<GameHookState>({
    loading: true,
    error: null,
    view: null,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/game');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GameView = await res.json();
      if (data.type !== 'game.state') throw new Error('Unexpected response');
      setState({ loading: false, error: null, view: data });
    } catch (err) {
      console.error('Failed to load game', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load game state',
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll periodically so both clients stay in sync
  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 1500);
    return () => window.clearInterval(id);
  }, [load]);

  const play = useCallback(
    async (index: number) => {
      try {
        const res = await fetch('/api/game/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index }),
        });
        if (!res.ok) {
          console.error('Move failed', await res.text());
          return;
        }
      const data: GameView = await res.json();
        setState({ loading: false, error: null, view: data });
      } catch (err) {
        console.error('Failed to make move', err);
      }
    },
    []
  );

  const reset = useCallback(async () => {
    try {
      const res = await fetch('/api/game/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        console.error('Reset failed', await res.text());
        return;
      }
      const data: GameView = await res.json();
      setState({ loading: false, error: null, view: data });
    } catch (err) {
      console.error('Failed to reset game', err);
    }
  }, []);

  const view = state.view;
  const status: GameStatus | null = view?.status ?? null;
  const yourRole = view?.you.role ?? 'spectator';

  const canPlay =
    !!view &&
    status === 'playing' &&
    (yourRole === 'X' || yourRole === 'O') &&
    view.turn === yourRole;

  const isYouWinner =
    !!view &&
    status === 'won' &&
    (yourRole === 'X' || yourRole === 'O') &&
    view.winner === yourRole;

  return {
    loading: state.loading,
    error: state.error,
    view,
    canPlay,
    isYouWinner,
    play,
    reset,
  } as const;
}

