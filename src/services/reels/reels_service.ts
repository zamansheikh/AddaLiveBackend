import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelRepository } from "../../repository/reels/reels_interface";
import { CloudinaryFolder } from "../../Utils/enums";
import { uploadFileToCloudinary } from "../../Utils/upload_file_cloudinary";



export default class ReelsService {
    ReelRepository: IReelRepository;
    constructor(ReelRepository: IReelRepository) {
        this.ReelRepository = ReelRepository;
    }

    async createReel({ body, file }: { body: Partial<Record<string, any>>, file: Express.Multer.File }) {

        const length = Number(body.video_length);

        if (length > 60) return null;

        try {
            const reelUrl = await uploadFileToCloudinary({ isVideo: true, folder: CloudinaryFolder.Reels, file });
            body["reelUrl"] = reelUrl;
            return await this.ReelRepository.create(body as IReelEntity)
        } catch (error) {
            console.log("Cloudinary error => ", error);
            return null;
        }

    }

}



