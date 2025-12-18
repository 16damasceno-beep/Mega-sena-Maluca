
export type ChaosLevel = 'Tranquilo' | 'Malucão' | 'Apocalíptico';

export interface GameState {
  selectedNumbers: number[];
  drawnNumbers: number[];
  isDrawing: boolean;
  resultMessage: string;
  hasWon: boolean;
  chaosLevel: ChaosLevel;
}

export type MessageType = 'insult' | 'win' | 'draw' | 'intro';
