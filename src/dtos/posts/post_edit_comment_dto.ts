import { IsString } from "class-validator";


export class PostEditCommentDto {
    @IsString()
    commentId!: string;

    @IsString()
    newCommentText!: string;

}