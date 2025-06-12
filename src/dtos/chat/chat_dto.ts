import { IsString } from "class-validator";


export default class ChatDto {
    @IsString()
    sender!: string;


    @IsString()
    reciever!: string;

}