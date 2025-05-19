import { IsString } from "class-validator";
import { ReactionType } from "../../Utils/enums";


export  class ReactOnCommentDto {
    @IsString()
    commentId!:string;

    @IsString()
    reaction_type!: ReactionType;
}