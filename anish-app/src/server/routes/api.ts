import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  GameCell,
  GamePlayerSymbol,
  GameState,
  GameView,
  IncrementResponse,
  InitResponse,
  LeaderboardEntry,
  LeaderboardGetResponse,
  LeaderboardRecordWinResponse,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

type LeaderboardStore = Record<string, number>;

function leaderboardKey(postId: string) {
  return `ttt:${postId}:leaderboard`;
}

function gameKey(postId: string) {
  return `ttt:${postId}:game`;
}

function parseLeaderboard(raw: string | null | undefined): LeaderboardStore {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const obj = parsed as Record<string, unknown>;
    const out: LeaderboardStore = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof k !== 'string') continue;
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function toEntries(store: LeaderboardStore, limit: number): LeaderboardEntry[] {
  return Object.entries(store)
    .map(([username, wins]) => ({ username, wins }))
    .sort((a, b) => b.wins - a.wins || a.username.localeCompare(b.username))
    .slice(0, limit);
}

const WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinner(board: GameCell[]): GamePlayerSymbol | null {
  for (const [a, b, c] of WIN_LINES) {
    const v = board[a];
    if (v && v === board[b] && v === board[c]) return v;
  }
  return null;
}

function createInitialGame(postId: string): GameState {
  return {
    postId,
    board: Array<GameCell>(9).fill(null),
    turn: 'X',
    status: 'waiting',
    winner: null,
    winnerUsername: null,
    players: { X: null, O: null },
    updatedAt: Date.now(),
  };
}

function parseGame(raw: string | null | undefined, postId: string): GameState {
  if (!raw) return createInitialGame(postId);
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!Array.isArray(parsed.board) || parsed.board.length !== 9) {
      return createInitialGame(postId);
    }
    return { ...parsed, postId };
  } catch {
    return createInitialGame(postId);
  }
}

function attachView(game: GameState, username: string): GameView {
  let role: GameView['you']['role'] = 'spectator';
  if (game.players.X === username) role = 'X';
  else if (game.players.O === username) role = 'O';

  return {
    type: 'game.state',
    ...game,
    you: {
      username,
      role,
    },
  };
}

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

api.get('/leaderboard', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }

  try {
    const [raw, username] = await Promise.all([
      redis.get(leaderboardKey(postId)),
      reddit.getCurrentUsername(),
    ]);

    const safeUsername = username ?? 'anonymous';
    const store = parseLeaderboard(raw);
    const myWins = store[safeUsername] ?? 0;

    return c.json<LeaderboardGetResponse>({
      type: 'leaderboard.get',
      postId,
      username: safeUsername,
      myWins,
      entries: toEntries(store, 10),
    });
  } catch (error) {
    console.error(`Leaderboard get error for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load leaderboard' },
      500
    );
  }
});

api.post('/leaderboard/win', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';

    const key = leaderboardKey(postId);
    const raw = await redis.get(key);
    const store = parseLeaderboard(raw);
    store[username] = (store[username] ?? 0) + 1;

    // Store as JSON for simple reads (no Redis sorted-sets assumed)
    await redis.set(key, JSON.stringify(store));

    return c.json<LeaderboardRecordWinResponse>({
      type: 'leaderboard.recordWin',
      postId,
      username,
      myWins: store[username],
    });
  } catch (error) {
    console.error(`Leaderboard recordWin error for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to record win' },
      500
    );
  }
});

api.get('/game/share-url', async (c) => {
  const { postId, subredditName } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }
  const sub = subredditName ?? 'reddit';
  const cleanId = postId.startsWith('t3_') ? postId.slice(3) : postId;
  const url = `https://www.reddit.com/r/${sub}/comments/${cleanId}/`;
  return c.json<{ type: 'game.shareUrl'; url: string }>({
    type: 'game.shareUrl',
    url,
  });
});

api.get('/game', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }

  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  const raw = await redis.get(gameKey(postId));
  let game = parseGame(raw, postId);

  // Auto-join as X or O if there's a free slot
  if (!game.players.X) game = { ...game, players: { ...game.players, X: username } };
  else if (!game.players.O && game.players.X !== username) {
    game = { ...game, players: { ...game.players, O: username } };
  }

  // If both players now present and game was waiting, start playing
  if (game.status === 'waiting' && game.players.X && game.players.O) {
    game = { ...game, status: 'playing', updatedAt: Date.now() };
  }

  await redis.set(gameKey(postId), JSON.stringify(game));

  const view = attachView(game, username);
  return c.json<GameView>(view);
});

api.post('/game/move', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }

  const body = await c.req.json<{ index: number }>().catch(() => ({ index: -1 }));
  const idx = body.index;
  if (typeof idx !== 'number' || idx < 0 || idx > 8) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Invalid move index' },
      400
    );
  }

  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  const raw = await redis.get(gameKey(postId));
  let game = parseGame(raw, postId);

  // Determine role
  let role: GamePlayerSymbol | null = null;
  if (game.players.X === username) role = 'X';
  else if (game.players.O === username) role = 'O';

  if (!role) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'You are a spectator and cannot play moves' },
      403
    );
  }

  if (game.status !== 'playing') {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Game is not currently active' },
      400
    );
  }

  if (game.turn !== role) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Not your turn' },
      400
    );
  }

  if (game.board[idx] !== null) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Cell already taken' },
      400
    );
  }

  const board = game.board.slice();
  board[idx] = role;

  const winner = getWinner(board);
  const isTie = !winner && board.every((c) => c !== null);

  let status: GameState['status'] = game.status;
  let winnerUsername: string | null = null;
  let turn: GameState['turn'] = game.turn === 'X' ? 'O' : 'X';

  if (winner) {
    status = 'won';
    turn = game.turn;
    winnerUsername = winner === 'X' ? game.players.X : game.players.O;
  } else if (isTie) {
    status = 'tie';
  }

  game = {
    ...game,
    board,
    turn,
    status,
    winner,
    winnerUsername,
    updatedAt: Date.now(),
  };

  await redis.set(gameKey(postId), JSON.stringify(game));

  const view = attachView(game, username);

  return c.json<GameView>(view);
});

api.post('/game/reset', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }

  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  const raw = await redis.get(gameKey(postId));
  let game = parseGame(raw, postId);

  // Only X or O can reset
  if (game.players.X !== username && game.players.O !== username) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Only players can reset the game' },
      403
    );
  }

  game = {
    ...game,
    board: Array<GameCell>(9).fill(null),
    turn: 'X',
    status: game.players.X && game.players.O ? 'playing' : 'waiting',
    winner: null,
    winnerUsername: null,
    updatedAt: Date.now(),
  };

  await redis.set(gameKey(postId), JSON.stringify(game));

  const view = attachView(game, username);

  return c.json<GameView>(view);
});
