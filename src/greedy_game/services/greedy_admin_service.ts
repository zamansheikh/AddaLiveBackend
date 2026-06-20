export interface GreedyApiResponse {
  status: number;
  data: unknown;
}

export interface IGreedyAdminService {
  getConfig(gameId: string): Promise<GreedyApiResponse>;
  updateConfig(
    gameId: string,
    data: Record<string, unknown>,
  ): Promise<GreedyApiResponse>;
  forceResult(
    gameId: string,
    body: Record<string, unknown>,
  ): Promise<GreedyApiResponse>;
  getRoundHistory(
    gameId: string,
    queryString: string,
  ): Promise<GreedyApiResponse>;
  getRoundDetail(
    gameId: string,
    roundId: string,
  ): Promise<GreedyApiResponse>;
  getDashboardStats(
    gameId: string,
    queryString: string,
  ): Promise<GreedyApiResponse>;
  searchUser(queryString: string): Promise<GreedyApiResponse>;
  getUserDetails(userId: string): Promise<GreedyApiResponse>;
  getUserBetHistory(
    userId: string,
    queryString: string,
  ): Promise<GreedyApiResponse>;
  getPauseStatus(gameId: string): Promise<GreedyApiResponse>;
  pauseGame(gameId: string): Promise<GreedyApiResponse>;
  resumeGame(gameId: string): Promise<GreedyApiResponse>;
}

export default class GreedyAdminService implements IGreedyAdminService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.GREEDY_GAME_BASE_URL || "http://localhost:3000";
    this.apiKey = process.env.GREEDY_GAME_ADMIN_API_KEY || "";
  }

  private async callApi(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<GreedyApiResponse> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const headers: Record<string, string> = { "x-admin-key": this.apiKey };
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  async getConfig(gameId: string): Promise<GreedyApiResponse> {
    return this.callApi("GET", `/admin/games/${gameId}/config`);
  }

  async updateConfig(
    gameId: string,
    data: Record<string, unknown>,
  ): Promise<GreedyApiResponse> {
    return this.callApi("PUT", `/admin/games/${gameId}/config`, data);
  }

  async forceResult(
    gameId: string,
    body: Record<string, unknown>,
  ): Promise<GreedyApiResponse> {
    return this.callApi("POST", `/admin/games/${gameId}/force-result`, body);
  }

  async getRoundHistory(
    gameId: string,
    queryString: string,
  ): Promise<GreedyApiResponse> {
    return this.callApi("GET", `/admin/games/${gameId}/rounds?${queryString}`);
  }

  async getRoundDetail(
    gameId: string,
    roundId: string,
  ): Promise<GreedyApiResponse> {
    return this.callApi("GET", `/admin/games/${gameId}/rounds/${roundId}`);
  }

  async getDashboardStats(
    gameId: string,
    queryString: string,
  ): Promise<GreedyApiResponse> {
    return this.callApi(
      "GET",
      `/admin/games/${gameId}/dashboard?${queryString}`,
    );
  }

  async searchUser(queryString: string): Promise<GreedyApiResponse> {
    return this.callApi("GET", `/admin/users/search?${queryString}`);
  }

  async getUserDetails(userId: string): Promise<GreedyApiResponse> {
    return this.callApi("GET", `/admin/users/${userId}/details`);
  }

  async getUserBetHistory(
    userId: string,
    queryString: string,
  ): Promise<GreedyApiResponse> {
    return this.callApi("GET", `/admin/users/${userId}/bets?${queryString}`);
  }

  async getPauseStatus(gameId: string): Promise<GreedyApiResponse> {
    return this.callApi("GET", `/admin/games/${gameId}/pause-status`);
  }

  async pauseGame(gameId: string): Promise<GreedyApiResponse> {
    return this.callApi("POST", `/admin/games/${gameId}/pause`);
  }

  async resumeGame(gameId: string): Promise<GreedyApiResponse> {
    return this.callApi("POST", `/admin/games/${gameId}/resume`);
  }
}
