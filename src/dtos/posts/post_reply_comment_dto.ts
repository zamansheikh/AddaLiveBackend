import { IsString } from "class-validator";

export class PostReplyCommentDto {
        @IsString()
        postId!: string;
    
        @IsString()
        commentId!: string;
    
        @IsString()
        commentText!: string;
    
}