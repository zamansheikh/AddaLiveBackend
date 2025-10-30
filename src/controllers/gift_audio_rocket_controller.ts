import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IGiftAudioRocketService } from "../services/audio_room_gifts/gift_audio_rocket_service";
import { sendResponseEnhanced } from "../core/Utils/send_response";
import { validateGiftAudioRocket } from "../core/Utils/helper_functions";

export class GiftAudioRocketController {
    service: IGiftAudioRocketService;
    constructor(service: IGiftAudioRocketService) {
      this.service = service;
    }
    
  createGiftAudioRocket = catchAsync(
    async (req: Request, res: Response) => {
      console.log(req.body);
      
      validateGiftAudioRocket(req.body, false);
      const giftAudioRocket = await this.service.createGiftAudioRocket(
        req.body
      );
      sendResponseEnhanced(res, giftAudioRocket);
    }
  );

  getGiftAudioRocket = catchAsync(
    async (req: Request, res: Response) => {
      const giftAudioRocket = await this.service.getGiftAudioRocket();
      sendResponseEnhanced(res, giftAudioRocket);
    }
  );

  updateGiftAudioRocket = catchAsync(
    async (req: Request, res: Response) => {
       validateGiftAudioRocket(req.body, true);
      const giftAudioRocket = await this.service.updateGiftAudioRocket(
        req.body
      );
      sendResponseEnhanced(res, giftAudioRocket);
    }
  );
  
}