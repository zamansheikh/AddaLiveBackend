import cloudinary from "../../config/cloudaniay_config";
import { ReelEntity } from "../../entities/reel_entity";
import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelRepository } from "../../repository/reels/reels_interface";
import { generateFileHash } from "../../Utils/helper_functions";



export default class ReelsService {
    ReelRepository: IReelRepository;
    constructor(ReelRepository: IReelRepository) {
        this.ReelRepository = ReelRepository;
    }

    async createReel({ body, file }: { body: Partial<Record<string, any>>, file: Express.Multer.File }) {

        const length = Number(body.video_length);

        if(length > 60) return null;

        const fileHash = generateFileHash(file.buffer);
        const publicId = `reels/${fileHash}`;
        try {
            const reelUrl = await new Promise<string>((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        public_id: publicId,
                        folder: 'reels',
                        resource_type: 'video',
                        overwrite: false,
                        eager: [],

                    },
                    (error, result) => {
                        if (error || !result) return reject(error);
                        resolve(result.secure_url);
                    }
                );
                stream.end(file.buffer);
            });
            body["reelUrl"] = reelUrl;
            return await this.ReelRepository.create(body as IReelEntity)
        } catch (error) {
            console.log("Cloudinary error => ", error);
            return null;
        }

    }

}



