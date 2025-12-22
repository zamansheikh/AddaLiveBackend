import { Request, Response } from "express";
import { IAdminUserService } from "../../services/admin/admin_user_service";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse, {
  sendResponseEnhanced,
} from "../../core/Utils/send_response";
import AppError from "../../core/errors/app_errors";
import { log } from "console";
import {
  ActivityZoneState,
  AdminPowers,
  StatusTypes,
  UserRoles,
} from "../../core/Utils/enums";
import {
  validateblockUser,
  validateCreatePortalUserData,
  validateFieldExistance,
  validateNumber,
  validatePermissions,
  validatePromoteUserPermission,
} from "../../core/Utils/helper_functions";
import { validateCreateSalary } from "../../dtos/salary/valodate_salary";

export default class AdminUserController {
  AdminUserService: IAdminUserService;
  constructor(AdminUserService: IAdminUserService) {
    this.AdminUserService = AdminUserService;
  }

  registerAdmin = catchAsync(async (req: Request, res: Response) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email)
      throw new AppError(StatusCodes.BAD_REQUEST, "All fields are required");
    const newAdmin = await this.AdminUserService.registerAdmin({
      username,
      password,
      email,
    });
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: newAdmin,
      message: "Admin registered successfully",
    });
  });

  loginAdmin = catchAsync(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "username and password are required"
      );
    const { user, token } = await this.AdminUserService.loginAdmin({
      username,
      password,
    });
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: [user],
      access_token: token,
      message: "Admin logged in successfully",
    });
  });

  updateAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { username, password, email, role, coins } = req.body;
    if (coins)
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Coins cannot be updated directly"
      );
    if (role)
      throw new AppError(StatusCodes.FORBIDDEN, "Role cannot be updated");
    if (!username && !password && !email && !coins)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (username, password, coins, or email) is required for update"
      );
    const updatedAdmin = await this.AdminUserService.updateAdmin(id, {
      username,
      password,
      email,
      coins,
    });
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedAdmin,
      message: "Admin updated successfully",
    });
  });

  deleteAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedAdmin = await this.AdminUserService.deleteAdmin(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: deletedAdmin,
      message: "Admin deleted successfully",
    });
  });

  getAdminProfile = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const admin = await this.AdminUserService.getAdminProfile(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: admin,
      message: "Admin profile retrieved successfully",
    });
  });

  assignCoinToAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { coins } = req.body;
    if (!coins)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User ID and coins are required"
      );
    if (isNaN(Number(coins)))
      throw new AppError(StatusCodes.BAD_REQUEST, "Coins must be a number");
    if (coins <= 0)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0"
      );
    const updatedUser = await this.AdminUserService.assignCoinToSelf(
      id,
      Number(coins)
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedUser,
      message: "Coins assigned to user successfully",
    });
  });

  getAllModerators = catchAsync(async (req: Request, res: Response) => {
    const moderators = await this.AdminUserService.getAllModerators(
      req.query as Record<string, unknown>
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: moderators,
      message: "Moderators retrieved successfully",
    });
  });

  moderatorPermissionEdit = catchAsync(async (req: Request, res: Response) => {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_GATEWAY,
      success: true,
      result: {},
      message: "This Api is No longer Supported",
    });
  });

  removePermissions = catchAsync(async (req: Request, res: Response) => {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_GATEWAY,
      success: true,
      result: {},
      message: "This Api is No longer Supported",
    });
  });

  updateActivityZone = catchAsync(async (req: Request, res: Response) => {
    const { id, zone, date_till } = req.body;
    const result = await this.AdminUserService.updateActivityZone({
      id: id,
      zone: zone,
      dateTill: date_till,
    });
    sendResponseEnhanced(res, result);
  });

  updateUserStat = catchAsync(async (req: Request, res: Response) => {
    const { stars, diamonds } = req.body;
    const userId = req.params.userId;
    if (!stars && !diamonds)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You must include either stars or diamonds in the request body"
      );
    const result = await this.AdminUserService.updateUserStat({
      diamonds,
      stars,
      userId,
    });
    sendResponseEnhanced(res, result);
  });

  createGift = catchAsync(async (req: Request, res: Response) => {
    const { giftName, category, coinPrice, diamonds } = req.body;
    const files = req.files as unknown as IGiftFile;
    if (!files)
      throw new AppError(StatusCodes.BAD_REQUEST, "Images are required");
    if (!files.previewImage || !files.svgaImage)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Either previewImage or svgaImage fields cannot be missing"
      );
    if (
      files.previewImage[0].mimetype !== "image/png" &&
      files.previewImage[0].mimetype !== "application/octet-stream"
    )
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Preview image must be a png or svga file"
      );
    if (isNaN(coinPrice) || isNaN(diamonds))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coin price and diamonds must be numbers"
      );
    if (coinPrice < 1)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coin price must be greater than 0"
      );
    if (diamonds < 1)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Diamonds must be greater than 0"
      );

    const newGift = await this.AdminUserService.createGift({
      name: giftName,
      category,
      coinPrice: parseInt(coinPrice, 10),
      diamonds: parseInt(diamonds, 10),
      previewImage: files.previewImage[0],
      svgaImage: files.svgaImage[0],
    });
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: newGift,
      message: "Gift created successfully",
    });
  });

  getGifts = catchAsync(async (req: Request, res: Response) => {
    const gifts = await this.AdminUserService.getGifts(req.query);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: gifts,
      message: "Gifts retrieved successfully",
    });
  });

  updateGift = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { giftName, category, coinPrice, diamonds } = req.body;
    const files = req.files as unknown as IGiftFile;
    const previewImage = files.previewImage?.[0];
    const svgaImage = files.svgaImage?.[0];
    const image = previewImage || svgaImage;
    if (!giftName && !coinPrice && !diamonds && !image)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (giftName, category, coinPrice, or diamonds) is required for update"
      );
    if (coinPrice && (isNaN(coinPrice) || coinPrice < 1))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coin price must be a number greater than 0"
      );
    if (diamonds && (isNaN(diamonds) || diamonds < 1))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Diamonds must be a number greater than 0"
      );

    const updatedGift = await this.AdminUserService.updateGift(id, {
      name: giftName,
      category,
      coinPrice,
      diamonds,
      svgaImage,
      previewImage,
    });
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedGift,
      message: "Gift updated successfully",
    });
  });

  deleteGift = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedGift = await this.AdminUserService.deleteGift(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: deletedGift,
      message: "Gift deleted successfully",
    });
  });

  getGiftCategory = catchAsync(async (req: Request, res: Response) => {
    const giftCategories = await this.AdminUserService.getGiftCategories(
      req.query as Record<string, string>
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: giftCategories,
      message: "Gift categories retrieved successfully",
    });
  });

  createPortalUser = catchAsync(async (req: Request, res: Response) => {
    validateCreatePortalUserData(req.body);
    const newPortalUser = await this.AdminUserService.createPortalUser(
      req.body
    );
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: newPortalUser,
      message: "Role created successfully",
    });
  });

  getRoleDetails = catchAsync(async (req: Request, res: Response) => {
    const { roleId } = req.params;
    const role = await this.AdminUserService.getPortalUser(roleId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: role,
      message: "Role details retrieved successfully",
    });
  });
  deleteRole = catchAsync(async (req: Request, res: Response) => {
    const { roleId } = req.params;
    const deletedRole = await this.AdminUserService.deletePortalUser(roleId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: deletedRole,
      message: "Role deleted successfully",
    });
  });

  addRolePermissions = catchAsync(async (req: Request, res: Response) => {
    const { roleId } = req.params;
    const { permissions } = req.body;
    validatePermissions(permissions);
    // Assuming a method in AdminUserService to add permissions to a portal user
    // This method would need to be implemented in admin_user_service.ts
    const updatedPortalUser =
      await this.AdminUserService.addPermissionsToPortalUser(
        roleId,
        permissions
      );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedPortalUser,
      message: "Permissions added successfully to portal user",
    });
  });

  removeRolePermissions = catchAsync(async (req: Request, res: Response) => {
    const { roleId } = req.params;
    const { permissions } = req.body;
    validatePermissions(permissions);
    // Assuming a method in AdminUserService to remove permissions from a portal user
    // This method would need to be implemented in admin_user_service.ts
    const updatedPortalUser =
      await this.AdminUserService.removePermissionsFromPortalUser(
        roleId,
        permissions
      );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedPortalUser,
      message: "Permissions removed successfully from portal user",
    });
  });

  blockPortalUser = catchAsync(async (req: Request, res: Response) => {
    const { targetId, zone, date_till } = req.body;
    validateblockUser(req.body);
    const result = await this.AdminUserService.updateRoleActivityZone(
      targetId,
      zone,
      date_till
    );
    sendResponseEnhanced(res, result);
  });

  getWithdrawRequests = catchAsync(async (req: Request, res: Response) => {
    log(req.query);
    const withdrawRequests = await this.AdminUserService.getWithdrawRequests(
      req.query as Record<string, unknown>
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: withdrawRequests,
      message: "Withdraw requests retrieved successfully",
    });
  });

  updateWithdrawBonusStatus = catchAsync(
    async (req: Request, res: Response) => {
      const { bonusId } = req.params;
      const { status } = req.body;
      if (!status)
        throw new AppError(StatusCodes.BAD_REQUEST, "Status is required");
      if (!Object.values(StatusTypes).includes(status as StatusTypes))
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `invalid status -> ${status}`
        );
      const updatedRequest =
        await this.AdminUserService.updateWithdrawBonusStatus(bonusId, status);
      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        result: updatedRequest,
        message: "Withdraw request status updated successfully",
      });
    }
  );
  createSalary = catchAsync(async (req: Request, res: Response) => {
    const { diamondCount, moneyCount, country, type } = req.body;
    validateCreateSalary(req.body);
    const newSalary = await this.AdminUserService.createSalary({
      diamondCount,
      moneyCount,
      country,
      type,
    });
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: newSalary,
      message: "Salary created successfully",
    });
  });

  getSalaries = catchAsync(async (req: Request, res: Response) => {
    const salaries = await this.AdminUserService.getSalaries();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: salaries,
      message: "Salaries retrieved successfully",
    });
  });

  getSalaryDetails = catchAsync(async (req: Request, res: Response) => {
    const { salaryId } = req.params;
    const salary = await this.AdminUserService.getSalaryById(salaryId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: salary,
      message: "Salary details retrieved successfully",
    });
  });

  updateSalary = catchAsync(async (req: Request, res: Response) => {
    const { salaryId } = req.params;
    const { diamondCount, moneyCount, country } = req.body;
    if (!diamondCount && !moneyCount && !country) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (diamondCount, moneyCount, or country) is required for update"
      );
    }
    const updatedSalary = await this.AdminUserService.updateSalary(salaryId, {
      diamondCount,
      moneyCount,
      country,
    });
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedSalary,
      message: "Salary updated successfully",
    });
  });

  deleteSalary = catchAsync(async (req: Request, res: Response) => {
    const { salaryId } = req.params;
    const deletedSalary = await this.AdminUserService.deleteSalary(salaryId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: deletedSalary,
      message: "Salary deleted successfully",
    });
  });
  agencyCommissionDistribute = catchAsync(
    async (req: Request, res: Response) => {
      const result = await this.AdminUserService.autoDistributeBonusToAgency();
      sendResponseEnhanced(res, result);
    }
  );

  assignRoleToUser = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.body;
    const { role } = req.params;
    if (!userId || !role)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "userId and role are required"
      );
    if (!Object.values(UserRoles).includes(role as UserRoles))
      throw new AppError(StatusCodes.BAD_REQUEST, `invalid role -> ${role}`);
    const updatedUser = await this.AdminUserService.assignRoleToUser(
      userId,
      role as UserRoles
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedUser,
      message: "User role updated successfully",
    });
  });
  getUsersBasedOnRole = catchAsync(async (req: Request, res: Response) => {
    const { role } = req.params;
    if (!role) throw new AppError(StatusCodes.BAD_REQUEST, "role is required");
    if (!Object.values(UserRoles).includes(role as UserRoles))
      throw new AppError(StatusCodes.BAD_REQUEST, `invalid role -> ${role}`);
    const users = await this.AdminUserService.getUsersBasedOnRole(
      role as UserRoles,
      req.query as Record<string, unknown>
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: users,
      message: `${role}s retrieved successfully`,
    });
  });

  getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const result = await this.AdminUserService.getDashboardStats();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Dashboard stats retrieved successfully",
    });
  });

  createBanner = catchAsync(async (req: Request, res: Response) => {
    const { alt } = req.body;
    const file = req.file as Express.Multer.File;
    if (!file) throw new AppError(StatusCodes.BAD_REQUEST, "Image is required");
    if (!alt) throw new AppError(StatusCodes.BAD_REQUEST, "Alt is required");
    const result = await this.AdminUserService.createBanner(alt, file);
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: result,
      message: "Banner created successfully",
    });
  });

  getBanners = catchAsync(async (req: Request, res: Response) => {
    const banners = await this.AdminUserService.getBanners();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: banners,
      message: "Banners retrieved successfully",
    });
  });

  updateBanner = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { alt } = req.body;
    const file = req.file as Express.Multer.File;
    if (!alt && !file)
      throw new AppError(StatusCodes.BAD_REQUEST, "Data is required");
    const result = await this.AdminUserService.updateBanner(id, alt, file);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Banner updated successfully",
    });
  });

  deleteBanner = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.AdminUserService.deleteBanner(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Banner deleted successfully",
    });
  });

  getBannerDoc = catchAsync(async (req: Request, res: Response) => {
    const banners = await this.AdminUserService.getBannerDocs();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: banners,
      message: "Banners retrieved successfully",
    });
  });
  // posters
  createPoster = catchAsync(async (req: Request, res: Response) => {
    const { alt } = req.body;
    const file = req.file as Express.Multer.File;
    if (!file) throw new AppError(StatusCodes.BAD_REQUEST, "Image is required");
    if (!alt) throw new AppError(StatusCodes.BAD_REQUEST, "Alt is required");
    const result = await this.AdminUserService.createPoster(alt, file);
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: result,
      message: "Poster created successfully",
    });
  });

  getPosters = catchAsync(async (req: Request, res: Response) => {
    const Posters = await this.AdminUserService.getPosters();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: Posters,
      message: "Posters retrieved successfully",
    });
  });

  getRandomPosters = catchAsync(async (req: Request, res: Response) => {
    const Posters = await this.AdminUserService.getRandomPosters();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: Posters,
      message: "Posters retrieved successfully",
    });
  });

  updatePoster = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { alt } = req.body;
    const file = req.file as Express.Multer.File;
    if (!alt && !file)
      throw new AppError(StatusCodes.BAD_REQUEST, "Data is required");
    const result = await this.AdminUserService.updatePoster(id, alt, file);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Poster updated successfully",
    });
  });

  deletePoster = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.AdminUserService.deletePoster(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Poster deleted successfully",
    });
  });

  getAdminCoinHistory = catchAsync(async (req: Request, res: Response) => {
    const result = await this.AdminUserService.getCoinHistory(
      UserRoles.Admin,
      null,
      req.query
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "transaction history retrieved successfully",
    });
  });

  getPortalUserCoinHistory = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await this.AdminUserService.getCoinHistory(
      UserRoles.Merchant,
      userId,
      req.query
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "transaction history retrieved successfully",
    });
  });

  getAgencyWithdrawList = catchAsync(async (req: Request, res: Response) => {
    const result = await this.AdminUserService.getAgencyWithdrawList(req.query);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Agency withdraw list retrieved successfully",
    });
  });

  updateAgencyWithdrawStatus = catchAsync(
    async (req: Request, res: Response) => {
      const { withdrawId } = req.params;
      const { status } = req.body;
      if (!status)
        throw new AppError(StatusCodes.BAD_REQUEST, "Status is required");
      if (!Object.values(StatusTypes).includes(status as StatusTypes))
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `invalid status -> ${status}`
        );
      const updatedRequest =
        await this.AdminUserService.updateAgencyWithdrawStatus(
          withdrawId,
          status
        );
      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        result: updatedRequest,
        message: "Agency withdraw status updated successfully",
      });
    }
  );

  createLevelTag = catchAsync(async (req: Request, res: Response) => {
    const { tag, bg } = req.files as ITagFiles; // both are arrays
    const { level } = req.body;
    const tagFile = tag?.[0];
    const bgFile = bg?.[0];
    if (!tagFile || !bgFile || !level)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Either tag or bg fields cannot be missing"
      );

    if (!/^\d+-\d+$/.test(level))
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid level format");

    const result = await this.AdminUserService.createLevelTagBg(
      level,
      tagFile,
      bgFile
    );
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: result,
      message: "Level tag created successfully",
    });
  });

  getLevelTags = catchAsync(async (req: Request, res: Response) => {
    const result = await this.AdminUserService.getLevelTagBgs();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Level tags retrieved successfully",
    });
  });

  updateLeveltags = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { level } = req.body;
    const files = req.files as ITagFiles;
    const tagFile = files.tag?.[0];
    const bgFile = files.bg?.[0];

    if (!level && !tagFile && !bgFile) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (level, tag, or bg) is required for update"
      );
    }

    if (level && !/^\d+-\d+$/.test(level))
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid level format");

    const result = await this.AdminUserService.updateLevelTagBg(
      id,
      level,
      tagFile,
      bgFile
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Level tag updated successfully",
    });
  });

  createUpdateCost = catchAsync(async (req: Request, res: Response) => {
    const { nameUpdateCost, expEquivalentCoin } = req.body;
    validateFieldExistance(nameUpdateCost, "nameUpdateCost");
    validateNumber(nameUpdateCost, "nameUpdateCost");
    validateFieldExistance(expEquivalentCoin, "expEquivalentCoin");
    validateNumber(expEquivalentCoin, "expEquivalentCoin");
    const result = await this.AdminUserService.createNewUpdateCost({
      nameUpdateCost: Number(nameUpdateCost),
      expEquivalentCoin: Number(expEquivalentCoin),
    });
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: result,
      message: "Update cost created successfully",
    });
  });

  getUpdateCost = catchAsync(async (req: Request, res: Response) => {
    const result = await this.AdminUserService.getUpdateCostDocument();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Update cost retrieved successfully",
    });
  });

  updateUpdateCost = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nameUpdateCost, expEquivalentCoin } = req.body;
    if (!nameUpdateCost && !expEquivalentCoin)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (nameUpdateCost, expEquivalentCoin) is required for update"
      );
    if (nameUpdateCost) validateNumber(nameUpdateCost, "nameUpdateCost");
    if (expEquivalentCoin)
      validateNumber(expEquivalentCoin, "expEquivalentCoin");
    const result = await this.AdminUserService.updateUpdateCostDocument(id, {
      nameUpdateCost: Number(nameUpdateCost),
    });
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Update cost updated successfully",
    });
  });

  deleteUpdateCost = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.AdminUserService.deleteUpdateCostDocument(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Update cost deleted successfully",
    });
  });

  getBannedUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await this.AdminUserService.getBannedUsers(
      req.query as Record<string, unknown>
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Banned users retrieved successfully",
    });
  });
}

export interface IGiftFile {
  previewImage?: Express.Multer.File[];
  svgaImage?: Express.Multer.File[];
}

export interface ITagFiles {
  tag?: Express.Multer.File[];
  bg?: Express.Multer.File[];
}
