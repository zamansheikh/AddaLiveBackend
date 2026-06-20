import catchAsync from "../../core/Utils/catch_async";
import { IGreedyAdminService } from "../services/greedy_admin_service";

export default class GreedyGameAdminController {
  private service: IGreedyAdminService;

  constructor(service: IGreedyAdminService) {
    this.service = service;
  }

  getConfig = catchAsync(async (req, res) => {
    const { status, data } = await this.service.getConfig("greedy");
    res.status(status).json(data);
  });

  updateConfig = catchAsync(async (req, res) => {
    const { status, data } = await this.service.updateConfig(
      "greedy",
      req.body,
    );
    res.status(status).json(data);
  });

  forceResult = catchAsync(async (req, res) => {
    const { status, data } = await this.service.forceResult(
      "greedy",
      req.body,
    );
    res.status(status).json(data);
  });

  getRoundHistory = catchAsync(async (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    const { status, data } = await this.service.getRoundHistory("greedy", qs);
    res.status(status).json(data);
  });

  getRoundDetail = catchAsync(async (req, res) => {
    const { status, data } = await this.service.getRoundDetail(
      "greedy",
      req.params.roundId,
    );
    res.status(status).json(data);
  });

  getDashboardStats = catchAsync(async (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    const { status, data } = await this.service.getDashboardStats(
      "greedy",
      qs,
    );
    res.status(status).json(data);
  });

  searchUser = catchAsync(async (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    const { status, data } = await this.service.searchUser(qs);
    res.status(status).json(data);
  });

  getUserDetails = catchAsync(async (req, res) => {
    const { status, data } = await this.service.getUserDetails(
      req.params.userId,
    );
    res.status(status).json(data);
  });

  getUserBetHistory = catchAsync(async (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    const { status, data } = await this.service.getUserBetHistory(
      req.params.userId,
      qs,
    );
    res.status(status).json(data);
  });

  getPauseStatus = catchAsync(async (req, res) => {
    const { status, data } = await this.service.getPauseStatus("greedy");
    res.status(status).json(data);
  });

  pauseGame = catchAsync(async (req, res) => {
    const { status, data } = await this.service.pauseGame("greedy");
    res.status(status).json(data);
  });

  resumeGame = catchAsync(async (req, res) => {
    const { status, data } = await this.service.resumeGame("greedy");
    res.status(status).json(data);
  });
}
