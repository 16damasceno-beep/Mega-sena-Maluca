
export interface GameState {
  selectedNumbers: number[];
  drawnNumbers: number[];
  isDrawing: boolean;
  resultMessage: string;
  hasWon: boolean;
  chaosLevel: number;
}

export type MessageType = 'insult' | 'win' | 'draw' | 'intro';
