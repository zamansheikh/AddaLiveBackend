import { IsNumber, IsString } from "class-validator";

export class CreateHistoryDto {
    @IsNumber()
    gold!:number;

    @IsNumber()
    diamond!:number;

    @IsNumber()
    total_amount!:number;
}