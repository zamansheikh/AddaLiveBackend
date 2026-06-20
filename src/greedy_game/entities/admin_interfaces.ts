export interface GreedyGameConfig {
  gameId: string;
  config: {
    rtp: number;
    manualResult: string | null;
  };
}

export interface GreedyGameConfigUpdateResponse {
  success: boolean;
}
