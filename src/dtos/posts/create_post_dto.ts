import { IsOptional, IsString } from "class-validator";


export class CreatePostDto {
  @IsString()
   ownerId!: string;
  
   @IsOptional()
   @IsString()
   postCaption!: string;
  
}