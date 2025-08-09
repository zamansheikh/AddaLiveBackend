import { IsNumber, IsOptional, isString, IsString } from "class-validator";

export class GiftUserDto {
    @IsString()
    userId!: string;

    @IsString()
    roomId!: string;

    @IsString()
    giftId!:string
}