import { useCallback, useEffect, useState } from 'react';
import type {
  LeaderboardGetResponse,
  LeaderboardRecordWinResponse,
} from '../../shared/api';

type LeaderboardState = {
  loading: boolean;
  username: string | null;
  myWins: number;
  entries: LeaderboardGetResponse['entries'];
};

export function useLeaderboard() {
  const [state, setState] = useState<LeaderboardState>({
    loading: true,
    username: null,
    myWins: 0,
    entries: [],
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LeaderboardGetResponse = await res.json();
      if (data.type !== 'leaderboard.get') throw new Error('Unexpected response');

      setState({
        loading: false,
        username: data.username,
        myWins: data.myWins,
        entries: data.entries,
      });
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordWin = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard/win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LeaderboardRecordWinResponse = await res.json();
      if (data.type !== 'leaderboard.recordWin') throw new Error('Unexpected response');
      await refresh();
    } catch (err) {
      console.error('Failed to record win', err);
    }
  }, [refresh]);

  return { ...state, refresh, recordWin } as const;
}

