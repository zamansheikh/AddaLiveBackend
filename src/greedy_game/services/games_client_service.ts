import { StatusCodes } from "http-status-codes";
import {
  SIGNATURE_HEADERS,
  newNonce,
  signatureHeader,
} from "../../core/Utils/games_signature";
import GamesApiError from "../errors/games_api_error";

export interface IReconciliationQuery {
  from: string;
  to: string;
  gameKey?: string;
  cursor?: string;
  limit?: number;
}

export interface IGamesClientService {
  getReconciliation(query: IReconciliationQuery): Promise<any>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * The single outbound door from Adda to the GAMES backend.
 *
 * Signed with the same HMAC scheme games uses to call us — one shared secret,
 * verified in both directions. `GAMES_BASE_URL` must include the games API prefix
 * (e.g. `http://localhost:5002/api/v1`), because the signature covers the full
 * path the games backend will see.
 *
 * Today this exists for reconciliation: games records every bet it asked us to
 * settle, so a daily diff against `greedy_game_wallet_transactions` catches any
 * debit that moved coins but never made it back into a round.
 */
export default class GamesClientService implements IGamesClientService {
  private get baseUrl(): string {
    return (process.env.GAMES_BASE_URL || "").replace(/\/$/, "");
  }

  private get secret(): string {
    return process.env.INTERNAL_SERVICE_SECRET || "";
  }

  private get timeoutMs(): number {
    const raw = Number(process.env.GAMES_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
  }

  async getReconciliation(query: IReconciliationQuery): Promise<any> {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.gameKey) params.set("gameKey", query.gameKey);
    if (query.cursor) params.set("cursor", query.cursor);
    if (query.limit) params.set("limit", String(query.limit));

    return this.request(
      "GET",
      `/internal/reconciliation/transactions?${params.toString()}`,
    );
  }

  private async request(method: "GET" | "POST", path: string, body?: unknown): Promise<any> {
    if (!this.baseUrl || !this.secret) {
      throw new GamesApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        "GAMES_NOT_CONFIGURED",
        "GAMES_BASE_URL / INTERNAL_SERVICE_SECRET are not set",
      );
    }

    const url = `${this.baseUrl}${path}`;
    // Sign the full request target the games backend will see, query string
    // included — otherwise a captured call could be re-aimed at another window.
    const target = new URL(url);
    const bodyText = body === undefined ? "" : JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      [SIGNATURE_HEADERS.operatorId]: process.env.GAMES_OPERATOR_ID || "adda",
      [SIGNATURE_HEADERS.timestamp]: String(timestamp),
      [SIGNATURE_HEADERS.nonce]: newNonce(),
      [SIGNATURE_HEADERS.signature]: "",
    };
    headers[SIGNATURE_HEADERS.signature] = signatureHeader(this.secret, {
      method,
      path: target.pathname + target.search,
      timestamp,
      nonce: headers[SIGNATURE_HEADERS.nonce],
      body: bodyText,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        ...(bodyText ? { body: bodyText } : {}),
        // Without a deadline a hung games backend pins this request forever.
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: any) {
      const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
      throw new GamesApiError(
        StatusCodes.BAD_GATEWAY,
        timedOut ? "GAMES_TIMEOUT" : "GAMES_UNREACHABLE",
        timedOut
          ? "Games backend did not respond in time"
          : "Games backend is unreachable",
      );
    }

    const payload: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new GamesApiError(
        StatusCodes.BAD_GATEWAY,
        payload?.error?.code ?? "GAMES_ERROR",
        payload?.error?.message ?? `Games call failed (${response.status})`,
      );
    }

    // Games wraps success as { success, data }; tolerate a bare payload too.
    return payload?.success === true ? payload.data : payload;
  }
}
