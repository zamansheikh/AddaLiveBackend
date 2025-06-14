import { IsString } from "class-validator";


export default class ChatDto {
    @IsString()
    reciever!: string;
}