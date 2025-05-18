import { IsString } from "class-validator";


export class ReplyCommentDto {

    @IsString()
    reelId!: string;

    @IsString()
    commentId!: string;

    @IsString()
    commentText!: string;
}