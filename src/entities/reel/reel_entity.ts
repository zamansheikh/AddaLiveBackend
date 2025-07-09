
import { ReelStatus } from "../../core/Utils/enums";
import { IReelsComment } from "../../models/reels/comments/reels_comment_interface";
import { IReelsReaction } from "../../models/reels/likes/reels_reaction_interface";
import { IReelEntity } from "./reel_entity_interface";




export class ReelEntity implements IReelEntity {
    owenerId: string;
    status?: ReelStatus.active | ReelStatus.inactive;
    videoLength: number;
    videoMaximumLength?: number;
    reelUrl: string;
    reactions?: IReelsReaction[];
    comments?: IReelsComment[];
    topRank?: number;

    constructor(data: IReelEntity) {
        this.owenerId = data.owenerId;
        this.status = data.status;
        this.videoLength = data.videoLength;
        this.videoMaximumLength = data.videoMaximumLength;
        this.reelUrl = data.reelUrl;
        this.reactions = data.reactions;
        this.comments = data.comments;
        this.topRank = data.topRank;
    }
}