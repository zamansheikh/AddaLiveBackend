import { IsString } from "class-validator";

export class FriendRequestDto {
    @IsString()
    recieverId!: string;
}