import { StatusCodes } from "http-status-codes";
import { PrivilegeTypes } from "../../core/Utils/enums";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import AppError from "../../core/errors/app_errors";
import User from "../../models/user/user_model";

export default class PrivilegeService {
  private static instance: PrivilegeService;

  private readonly availablePrivileges = [
    {
      name: PrivilegeTypes.AntiBanChat,
      description: "No one can ban from sending messages in the room",
      tag: "anti_ban_chat",
    },
    {
      name: PrivilegeTypes.AntiKick,
      description: "No one can kick you from the room",
      tag: "anti_kick",
    },
    {
      name: PrivilegeTypes.AntiMute,
      description: "No one can mute you in the room",
      tag: "anti_mute",
    },
  ];

  private constructor() {}

  public static getInstance(): PrivilegeService {
    if (!PrivilegeService.instance) {
      PrivilegeService.instance = new PrivilegeService();
    }
    return PrivilegeService.instance;
  }

  public async getPrivilages() {
    return this.availablePrivileges;
  }

  /** The user's on/off toggle map (missing key = enabled). */
  private async getSettings(userId: string): Promise<Record<string, boolean>> {
    const user = await User.findById(userId)
      .select("svipPrivilegeSettings")
      .lean();
    const raw = (user as any)?.svipPrivilegeSettings;
    return raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};
  }

  /**
   * Every SVIP privilege with whether the user OWNS it (equipped SVIP item)
   * and whether it's currently switched ON. Used by the app's SVIP Settings.
   */
  public async getMyPrivileges(userId: string) {
    const [active, settings] = await Promise.all([
      RepositoryProviders.myBucketRepositoryProvider.getEquippedPrivileges(
        userId,
      ),
      this.getSettings(userId),
    ]);
    return this.availablePrivileges.map((p) => {
      const owned = active.includes(p.name);
      return {
        name: p.name,
        description: p.description,
        tag: p.tag,
        owned,
        // Default ON when owned and no explicit toggle stored.
        enabled: owned && settings[p.name] !== false,
      };
    });
  }

  /**
   * Turn a privilege on/off. Only privileges the user actually owns can be
   * toggled. Returns the updated per-privilege state list.
   */
  public async setPrivilegeSetting(
    userId: string,
    privilege: string,
    enabled: boolean,
  ) {
    const known = this.availablePrivileges.some((p) => p.name === privilege);
    if (!known) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Unknown privilege");
    }

    const active =
      await RepositoryProviders.myBucketRepositoryProvider.getEquippedPrivileges(
        userId,
      );
    if (!active.includes(privilege as PrivilegeTypes)) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "You don't have this privilege",
      );
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

    const settings: Record<string, boolean> = {
      ...((user as any).svipPrivilegeSettings || {}),
    };
    settings[privilege] = enabled;
    (user as any).svipPrivilegeSettings = settings;
    user.markModified("svipPrivilegeSettings");
    await user.save();

    return this.getMyPrivileges(userId);
  }

  /**
   * Checks if a user has a specific privilege based on their equipped store items.
   * Uses an optimized repository call to minimize database and network overhead.
   *
   * @param userId - The ID of the user to check
   * @param privilege - The privilege type to look for
   * @returns Promise<boolean> - True if the user has the privilege
   */
  public async hasPrivilege(
    userId: string,
    privilege: PrivilegeTypes,
  ): Promise<boolean> {
    const activePrivileges =
      await RepositoryProviders.myBucketRepositoryProvider.getEquippedPrivileges(
        userId,
      );
    if (!activePrivileges.includes(privilege)) return false;
    // The user owns it — honour their on/off toggle (default ON when unset).
    const settings = await this.getSettings(userId);
    return settings[privilege] !== false;
  }

  /**
   * Specifically checks if a user can be muted.
   * Returns false if the user has the AntiMute privilege.
   *
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user can be muted, false if they are protected
   */
  public async canUserBeMuted(userId: string): Promise<boolean> {
    const hasAntiMute = await this.hasPrivilege(
      userId,
      PrivilegeTypes.AntiMute,
    );
    return !hasAntiMute;
  }

  /**
   * Checks if a user can be kicked from a room.
   * Returns false if the user has the AntiKick privilege.
   *
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user can be kicked, false if they are protected
   */
  public async canUserBeKicked(userId: string): Promise<boolean> {
    const hasAntiKick = await this.hasPrivilege(
      userId,
      PrivilegeTypes.AntiKick,
    );
    return !hasAntiKick;
  }

  /**
   * Checks if a user can be banned from a room.
   * Returns false if the user has the AntiBanChat privilege.
   *
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user can be banned, false if they are protected
   */
  public async canUserBeBannedFromChat(userId: string): Promise<boolean> {
    const hasAntiBan = await this.hasPrivilege(
      userId,
      PrivilegeTypes.AntiBanChat,
    );
    return !hasAntiBan;
  }
}
