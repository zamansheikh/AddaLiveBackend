import { IsNumber, Min, IsNotEmpty, IsMongoId } from "class-validator";
import { Type } from "class-transformer";

export class GrantItemDto {
    @IsNumber()
    @Min(100001)
    @Type(() => Number)
    userId!: number;

    @IsMongoId()
    @IsNotEmpty()
    itemId!: string;

    @IsNumber()
    @Min(1)
    @Type(() => Number)
    validity!: number;
}
