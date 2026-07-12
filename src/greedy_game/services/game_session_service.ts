import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { IUserRepository } from "../../repository/users/user_repository";
import GamesApiError from "../errors/games_api_error";

export interface IGameSessionToken {
  token: string;
  /** Seconds until the token expires. The client should re-mint or call the
   *  games backend's own `POST /games/session/extend` before then. */
  expiresIn: number;
  /** Where to point the game client, when configured. */
  gamesBaseUrl?: string;
}

export interface IGameSessionService {
  mintPlayerToken(userId: string): Promise<IGameSessionToken>;
}

/** Games defaults to a 15-minute access token; keep the two in step. */
function tokenTtlSeconds(): number {
  const raw = Number(process.env.GAME_SESSION_TOKEN_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 900;
}

/**
 * Mints the player token the GAMES backend accepts.
 *
 * Adda's own login token cannot be reused: it carries `{ id, role, permissions }`
 * and is signed with `JWT_SECRET` with NO expiry, while the games backend verifies
 * with a shared `JWT_ACCESS_SECRET` and requires `sub` plus a live `exp`. Handing
 * games our login token would fail on both counts — and sharing `JWT_SECRET` would
 * hand another service the key to every admin session in Adda.
 *
 * So this issues a separate, narrow, short-lived credential:
 *
 *   { sub: <user _id>, username, sst: <session start> }  exp: 15m
 *   signed with GAME_JWT_ACCESS_SECRET  ==  the games backend's JWT_ACCESS_SECRET
 *
 * `sst` is the original login time, which games carries across every extension so
 * a session cannot be slid past its 8-hour cap.
 *
 * Flow: client logs into Adda → POST /api/game/session/token → passes the returned
 * token to the games backend as `Authorization: Bearer <token>`.
 */
export default class GameSessionService implements IGameSessionService {
  UserRepo: IUserRepository;

  constructor(UserRepo: IUserRepository) {
    this.UserRepo = UserRepo;
  }

  async mintPlayerToken(userId: string): Promise<IGameSessionToken> {
    const secret = process.env.GAME_JWT_ACCESS_SECRET;

    if (!secret) {
      throw new GamesApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        "GAMES_NOT_CONFIGURED",
        "GAME_JWT_ACCESS_SECRET is not set — games are disabled",
      );
    }

    const user = await this.UserRepo.findUserById(userId);
    if (!user) {
      throw new GamesApiError(StatusCodes.NOT_FOUND, "USER_NOT_FOUND", "No such player");
    }

    const expiresIn = tokenTtlSeconds();
    const nowSec = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        // `sub` is what the games backend reads as the player id, and it is the
        // same ObjectId it hands back to us on every /internal/wallet/* call.
        sub: (user._id as any).toString(),
        username: user.username ?? user.name ?? "",
        sst: nowSec,
      },
      secret,
      { expiresIn },
    );

    return {
      token,
      expiresIn,
      ...(process.env.GAMES_PUBLIC_URL
        ? { gamesBaseUrl: process.env.GAMES_PUBLIC_URL }
        : {}),
    };
  }
}
