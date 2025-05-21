import { IsString } from "class-validator";

export class PostReplyCommentDto {
        @IsString()
        reelId!: string;
    
        @IsString()
        commentId!: string;
    
        @IsString()
        commentText!: string;
    
}