import { IAuthData } from "../models/user/user_model_interface";


export interface Avatar {
    name?: string;
    url?: string;
}

export interface ActivityZone {
    zone: "safe" | "temp_block" | "permanent_block";
    createdAt?: Date;
    expire?: Date;
}

export interface IUserEntity {
    id: string;
    username: string;
    email: string;
    password: string;
    authData: IAuthData,
    lastOnline?: Date;
    userStateInApp?: "Online" | "Offline";
    isReseller?: boolean;
    resellerCoins?: number;
    resellerWhatsAppNumber?: string;
    resellerHistory?: any[];
    avatar?: Avatar;
    name?: string;
    firstName?: string;
    lastName?: string;
    gender?: "male" | "female" | "other";
    birthday?: Date;
    country?: string;
    bio?: string;
    countryCode?: string;
    countryDialCode?: string;
    uid: string;
    countryLanguages?: string[];
    credit?: number;
    userPoints?: number;
    isViewer?: boolean;
    objectId?: string;
    activityZone?: Partial<ActivityZone>;
}