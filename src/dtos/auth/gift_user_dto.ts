import { IsNumber, IsOptional, isString, IsString } from "class-validator";

export class GiftUserDto {
    @IsString()
    roomId!: string;

    @IsString()
    giftId!:string
}