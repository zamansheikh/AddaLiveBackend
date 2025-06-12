import { IsString } from "class-validator";

export default class EditMessageDto {
    @IsString()
    newText!:string; 
}