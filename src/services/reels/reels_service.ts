import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelRepository } from "../../repository/reels/reels_interface";
import { CloudinaryFolder } from "../../Utils/enums";
import { uploadFileToCloudinary } from "../../Utils/upload_file_cloudinary";



export default class ReelsService {
    ReelRepository: IReelRepository;
    constructor(ReelRepository: IReelRepository) {
        this.ReelRepository = ReelRepository;
    }

    async createReel({ownerId, body, file }: {ownerId: string, body: Partial<Record<string, any>>, file: Express.Multer.File }) {
        body["ownerId"] = ownerId;
        const length = Number(body.video_length);
        if (length > 60) return "video length exceeded limit of 60 seconds";
        try {
            const reelUrl = await uploadFileToCloudinary({ isVideo: true, folder: CloudinaryFolder.Reels, file });
            body["reelUrl"] = reelUrl;
            return await this.ReelRepository.create(body as IReelEntity)
        } catch (error) {
            console.log("Cloudinary error => ", error);
            return "Upload failed";
        }
    }

    async editReel({reelID, reelCaption, userId}: {reelID: string, reelCaption: string, userId: string}) {
        const reel = await this.ReelRepository.findReelById(reelID);
        if(!reel) return "Reel Does not exist";
        if (reel.ownerId != userId) return "User does not have permission to edit the reel";
        return await this.ReelRepository.findReelByIdAndUpdate(reelID, {reelCaption})
    }

}



