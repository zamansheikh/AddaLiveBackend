import { IsString } from "class-validator";


export class ReelReactionDto {
    @IsString()
    reelId!: string;

    @IsString()
    reaction_type!: string;
}