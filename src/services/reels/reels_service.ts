import { IReelRepository } from "../../repository/reels/reels_interface";



export default class ReelsService {
    ReelRepository: IReelRepository;
    constructor(ReelRepository: IReelRepository) {
        this.ReelRepository = ReelRepository;
    }

    async createReel({ ownerID, file }: { ownerID: string, file: Express.Multer.File }) {
        console.log("owner Id", ownerID);
        console.log("file", file);
    }

}



