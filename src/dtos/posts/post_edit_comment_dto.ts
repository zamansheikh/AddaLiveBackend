import { IsString } from "class-validator";


export class PostEditComment {
    @IsString()
    commentId!: string;

    @IsString()
    newCommentText!: string;

}