import { IsString } from "class-validator";


export class EditReelDto {
    @IsString()
    reelID!: string;
    
    @IsString()
    reelCaption!: string;
}