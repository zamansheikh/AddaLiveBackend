import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import { validateFieldExistance } from "../../core/Utils/helper_functions";
import sendResponse from "../../core/Utils/send_response";
import { IAgoraConfigService } from "../../services/agora/agora_config_service";

export class AgoraConfigController {
  private service: IAgoraConfigService;

  constructor(service: IAgoraConfigService) {
    this.service = service;
  }

  create = catchAsync(async (req, res) => {
    const { appId, appCertificate, defaultChannel, defaultUid, defaultRole, tokenExpiry } = req.body;

    validateFieldExistance(appId, "appId");
    validateFieldExistance(appCertificate, "appCertificate");
    validateFieldExistance(defaultChannel, "defaultChannel");
    validateFieldExistance(defaultUid, "defaultUid");
    validateFieldExistance(defaultRole, "defaultRole");
    validateFieldExistance(tokenExpiry, "tokenExpiry");

    const config = await this.service.create({
      appId,
      appCertificate,
      defaultChannel,
      defaultUid,
      defaultRole,
      tokenExpiry,
    });

    sendResponse(res, {
      success: true,
      statusCode: 201,
      result: config,
    });
  });

  getAll = catchAsync(async (req, res) => {
    const configs = await this.service.getAll();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: configs,
    });
  });

  getById = catchAsync(async (req, res) => {
    const { id } = req.params;
    validateFieldExistance(id, "id");

    const config = await this.service.getById(id);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: config,
    });
  });

  update = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { appId, appCertificate, defaultChannel, defaultUid, defaultRole, tokenExpiry } = req.body;

    validateFieldExistance(id, "id");

    if (
      appId === undefined &&
      appCertificate === undefined &&
      defaultChannel === undefined &&
      defaultUid === undefined &&
      defaultRole === undefined &&
      tokenExpiry === undefined
    ) {
      throw new AppError(400, "At least one field to update is required");
    }

    const updatedConfig = await this.service.update(id, {
      appId,
      appCertificate,
      defaultChannel,
      defaultUid,
      defaultRole,
      tokenExpiry,
    });

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: updatedConfig,
    });
  });

  delete = catchAsync(async (req, res) => {
    const { id } = req.params;
    validateFieldExistance(id, "id");

    const deleted = await this.service.delete(id);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: deleted,
    });
  });
}
