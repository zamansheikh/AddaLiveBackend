import { ReactionType } from "../../core/Utils/enums";

export interface IReelReactionEntity {
    reactedBy: string;
    reactedTo: string;
    reactionType: ReactionType.Angry | ReactionType.Care | ReactionType.Haha | ReactionType.Like | ReactionType.Love | ReactionType.Sad,

}