import { IsString } from "class-validator";


export class StoryReactionDto {
    @IsString()
    storyId!: string;

    @IsString()
    reaction_type!:string;

}