import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelReactionRepository } from "../../repository/reels/likes/reel_reaction_interface";
import { IReelRepository } from "../../repository/reels/reels_interface";
import { CloudinaryFolder } from "../../Utils/enums";
import { uploadFileToCloudinary } from "../../Utils/upload_file_cloudinary";
import { IReelService } from "./reel_service_interface";
import { ReactionType } from "../../Utils/enums";



export default class ReelsService implements IReelService {
    ReelRepository: IReelRepository;
    ReactionRepository: IReelReactionRepository;
    constructor(ReelRepository: IReelRepository, ReactionRepository: IReelReactionRepository) {
        this.ReelRepository = ReelRepository;
        this.ReactionRepository = ReactionRepository;
    }

    async createReel({ ownerId, body, file }: { ownerId: string, body: Partial<Record<string, any>>, file: Express.Multer.File }) {
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

    async editReel({ reelID, reelCaption, userId }: { reelID: string, reelCaption: string, userId: string }) {
        const reel = await this.ReelRepository.findReelById(reelID);
        if (!reel) return "Reel Does not exist";
        if (reel.ownerId != userId) return "User does not have permission to edit the reel";
        return await this.ReelRepository.findReelByIdAndUpdate(reelID, { reelCaption })
    }

    async reactOnReels({ reelId, reaction_type, userID }: { reelId: string, reaction_type: string, userID: string }) {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {
            return "reaction_type is of wromg type";
        }

        const reaction = await this.ReactionRepository.findReelReactionsConditionally({ reactedTo: reelId, reactedBy: userID });
        
        if (reaction) {
            // todo: check if it has the same reaction_type as the reaction_type passsed then delete it. 
        } else {

            const reaction = await this.ReactionRepository.create({ reactedBy: userID, reactedTo: reelId, reaction_type: reaction_type as ReactionType });

            if (!reaction) return "something went wrong while registering the reaction in the database";

        }
        return null;
    }

}



