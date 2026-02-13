export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type LeaderboardEntry = {
  username: string;
  wins: number;
};

export type LeaderboardGetResponse = {
  type: 'leaderboard.get';
  postId: string;
  username: string;
  myWins: number;
  entries: LeaderboardEntry[];
};

export type LeaderboardRecordWinResponse = {
  type: 'leaderboard.recordWin';
  postId: string;
  username: string;
  myWins: number;
};

export type GamePlayerSymbol = 'X' | 'O';

export type GameStatus = 'waiting' | 'playing' | 'won' | 'tie';

export type GameCell = GamePlayerSymbol | null;

export type GamePlayers = {
  X: string | null;
  O: string | null;
};

export type GameState = {
  postId: string;
  board: GameCell[];
  turn: GamePlayerSymbol;
  status: GameStatus;
  winner: GamePlayerSymbol | null;
  winnerUsername: string | null;
  players: GamePlayers;
  updatedAt: number;
};

export type GameView = GameState & {
  type: 'game.state';
  you: {
    username: string;
    role: GamePlayerSymbol | 'spectator';
  };
};

export type GameMoveResponse = GameView & {
  type: 'game.move';
};

export type GameResetResponse = GameView & {
  type: 'game.reset';
};

export type GameShareUrlResponse = {
  type: 'game.shareUrl';
  url: string;
};
