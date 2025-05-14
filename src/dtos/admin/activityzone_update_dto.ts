import { IsString } from "class-validator";

export class ActivityZoneUpdateDto {
    @IsString()
    id!: string
}