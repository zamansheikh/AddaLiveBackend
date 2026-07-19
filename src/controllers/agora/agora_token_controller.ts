import { Request, Response } from "express";
import { RtcRole, RtcTokenBuilder, RtmTokenBuilder } from "agora-token";
import AgoraConfigRepository from "../../repository/agora/agora_config_repository";
import { AgoraRequestType } from "../../models/agora/agora_stats_model";
import { agoraStatsService } from "../../services/agora/agora_stats_service";

/**
 * Public Agora token endpoints, moved here from the standalone/admin-panel
 * token server so the mobile app can obtain RTC/RTM tokens from the main
 * backend. The App Certificate never leaves the server.
 *
 * Credentials are resolved from the DB config managed via the admin panel
 * (`/api/admin/agora-config`, newest wins), falling back to env
 * (`AGORA_APP_ID`, `PRIMARY_CERTIFICATE`) when no DB config exists yet. This
 * lets the App ID / Certificate be rotated from the admin panel without a
 * redeploy.
 *
 * Mounted at `/api/agora` (see server.ts):
 *   POST /api/agora/token/rtc
 *   POST /api/agora/token/rtm
 *   GET  /api/agora/token/rtc   (query-param variant, for testing)
 *   GET  /api/agora/token/rtm   (query-param variant, for testing)
 *   GET  /api/agora/token/info
 *   GET  /api/agora/health
 *
 * Responses are FLAT (`{ success, token, appId, ... }`) to match the app's
 * `AgoraTokenResponse.fromJson` — do NOT wrap them in `sendResponse`.
 */

const agoraConfigRepository = new AgoraConfigRepository();

interface ResolvedAgoraCreds {
  appId: string;
  appCertificate: string;
}

/**
 * Prefer the admin-panel-managed DB config (newest record), fall back to env.
 * Never throws — returns empty strings if nothing is configured, and callers
 * treat empty credentials as a 500.
 */
async function resolveCreds(): Promise<ResolvedAgoraCreds> {
  try {
    const configs = await agoraConfigRepository.getAll();
    const latest = configs[0]; // repository sorts newest-first
    if (latest?.appId && latest?.appCertificate) {
      return { appId: latest.appId, appCertificate: latest.appCertificate };
    }
  } catch {
    // DB unreachable / no config — fall through to env.
  }
  return {
    appId: process.env.AGORA_APP_ID ?? "",
    appCertificate: process.env.PRIMARY_CERTIFICATE ?? "",
  };
}

/**
 * Record a token request for the admin analytics. Fire-and-forget: a stats
 * write must never fail or delay the token response.
 */
function recordStat(type: AgoraRequestType): void {
  agoraStatsService.increment(type).catch(() => {
    /* analytics only — ignore */
  });
}

function rtcRoleFor(role: string): number | null {
  switch (role.toLowerCase()) {
    case "publisher":
      return RtcRole.PUBLISHER;
    case "subscriber":
      return RtcRole.SUBSCRIBER;
    default:
      return null;
  }
}

function buildRtcToken(
  creds: ResolvedAgoraCreds,
  channelName: string,
  uid: number,
  role: number,
  expireTime: number,
) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireTime;
  const token = RtcTokenBuilder.buildTokenWithUid(
    creds.appId,
    creds.appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs, // tokenExpire
    privilegeExpiredTs, // privilegeExpire
  );
  return { token, privilegeExpiredTs };
}

function buildRtmToken(
  creds: ResolvedAgoraCreds,
  uid: string,
  expireTime: number,
) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireTime;
  const token = RtmTokenBuilder.buildToken(
    creds.appId,
    creds.appCertificate,
    uid,
    privilegeExpiredTs,
  );
  return { token, privilegeExpiredTs };
}

export class AgoraTokenController {
  /** POST /api/agora/token/rtc */
  static rtcToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const creds = await resolveCreds();
      if (!creds.appId || !creds.appCertificate) {
        res.status(500).json({
          success: false,
          error: "Agora App ID and App Certificate must be configured",
        });
        return;
      }

      const body = (req.body ?? {}) as {
        channelName?: string;
        uid?: number | string;
        role?: string;
        expireTime?: number | string;
      };

      const channelName = body.channelName;
      if (!channelName) {
        res
          .status(400)
          .json({ success: false, error: "Channel name is required" });
        return;
      }

      const role = (body.role ?? "publisher").toString();
      const rtcRole = rtcRoleFor(role);
      if (rtcRole === null) {
        res.status(400).json({
          success: false,
          error: 'Role must be either "publisher" or "subscriber"',
        });
        return;
      }

      const uid =
        body.uid !== undefined && body.uid !== ""
          ? parseInt(String(body.uid), 10)
          : 0;
      if (Number.isNaN(uid)) {
        res.status(400).json({
          success: false,
          error: "UID must be a valid number or 0 for dynamic assignment",
        });
        return;
      }

      const expireTime =
        body.expireTime !== undefined
          ? parseInt(String(body.expireTime), 10)
          : 3600;

      const { token, privilegeExpiredTs } = buildRtcToken(
        creds,
        channelName,
        uid,
        rtcRole,
        expireTime,
      );

      recordStat("rtc");

      res.status(200).json({
        success: true,
        token,
        appId: creds.appId,
        channelName,
        uid,
        role,
        expireTime,
        expireAt: new Date(privilegeExpiredTs * 1000).toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to generate RTC token",
        message,
      });
    }
  };

  /** GET /api/agora/token/rtc — query-param variant for testing */
  static rtcTokenGet = async (req: Request, res: Response): Promise<void> => {
    try {
      const creds = await resolveCreds();
      if (!creds.appId || !creds.appCertificate) {
        res.status(500).json({
          success: false,
          error: "Agora App ID and App Certificate must be configured",
        });
        return;
      }

      const channelName = (req.query.channelName as string) ?? "test-channel";
      const role = ((req.query.role as string) ?? "publisher").toString();
      const rtcRole = rtcRoleFor(role);
      if (rtcRole === null) {
        res.status(400).json({
          success: false,
          error: 'Role must be either "publisher" or "subscriber"',
        });
        return;
      }

      const uid = req.query.uid
        ? parseInt(String(req.query.uid), 10)
        : 0;
      if (Number.isNaN(uid)) {
        res.status(400).json({
          success: false,
          error: "UID must be a valid number or 0 for dynamic assignment",
        });
        return;
      }

      const expireTime = req.query.expireTime
        ? parseInt(String(req.query.expireTime), 10)
        : 3600;

      const { token, privilegeExpiredTs } = buildRtcToken(
        creds,
        channelName,
        uid,
        rtcRole,
        expireTime,
      );

      recordStat("rtc");

      res.status(200).json({
        success: true,
        token,
        appId: creds.appId,
        channelName,
        uid,
        role,
        expireTime,
        expireAt: new Date(privilegeExpiredTs * 1000).toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to generate RTC token",
        message,
      });
    }
  };

  /** POST /api/agora/token/rtm */
  static rtmToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const creds = await resolveCreds();
      if (!creds.appId || !creds.appCertificate) {
        res.status(500).json({
          success: false,
          error: "Agora App ID and App Certificate must be configured",
        });
        return;
      }

      const body = (req.body ?? {}) as {
        uid?: number | string;
        expireTime?: number | string;
      };

      if (body.uid === undefined || body.uid === null || body.uid === "") {
        res
          .status(400)
          .json({ success: false, error: "UID is required for RTM token" });
        return;
      }

      const uid = String(body.uid);
      const expireTime =
        body.expireTime !== undefined
          ? parseInt(String(body.expireTime), 10)
          : 3600;

      const { token, privilegeExpiredTs } = buildRtmToken(
        creds,
        uid,
        expireTime,
      );

      recordStat("rtm");

      res.status(200).json({
        success: true,
        token,
        appId: creds.appId,
        uid,
        expireTime,
        expireAt: new Date(privilegeExpiredTs * 1000).toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to generate RTM token",
        message,
      });
    }
  };

  /** GET /api/agora/token/rtm — query-param variant for testing */
  static rtmTokenGet = async (req: Request, res: Response): Promise<void> => {
    try {
      const creds = await resolveCreds();
      if (!creds.appId || !creds.appCertificate) {
        res.status(500).json({
          success: false,
          error: "Agora App ID and App Certificate must be configured",
        });
        return;
      }

      const uid = ((req.query.uid as string) ?? "0").toString();
      const expireTime = req.query.expireTime
        ? parseInt(String(req.query.expireTime), 10)
        : 3600;

      const { token, privilegeExpiredTs } = buildRtmToken(
        creds,
        uid,
        expireTime,
      );

      recordStat("rtm");

      res.status(200).json({
        success: true,
        token,
        appId: creds.appId,
        uid,
        expireTime,
        expireAt: new Date(privilegeExpiredTs * 1000).toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to generate RTM token",
        message,
      });
    }
  };

  /** GET /api/agora/token/info */
  static tokenInfo = async (_req: Request, res: Response): Promise<void> => {
    const creds = await resolveCreds();
    if (!creds.appId || !creds.appCertificate) {
      res.status(500).json({
        success: false,
        error: "Configuration error",
        message: "Agora App ID and App Certificate must be configured",
      });
      return;
    }

    res.status(200).json({
      success: true,
      appId: creds.appId,
      serverTime: new Date().toISOString(),
      serverTimestamp: Math.floor(Date.now() / 1000),
      availableEndpoints: {
        rtcToken: "POST /api/agora/token/rtc",
        rtmToken: "POST /api/agora/token/rtm",
        rtcTokenGet: "GET /api/agora/token/rtc",
        rtmTokenGet: "GET /api/agora/token/rtm",
      },
      rtcTokenParams: {
        channelName: "string (required)",
        uid: "number (optional, default: 0 for dynamic)",
        role: 'string (optional, default: "publisher", values: "publisher" | "subscriber")',
        expireTime: "number (optional, default: 3600 seconds)",
      },
      rtmTokenParams: {
        uid: "string (required)",
        expireTime: "number (optional, default: 3600 seconds)",
      },
    });
  };

  /** GET /api/agora/health */
  static health = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? "development",
    });
  };
}
