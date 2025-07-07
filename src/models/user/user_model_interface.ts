import mongoose, { Document, Model } from 'mongoose';
import { IUserStats } from '../../entities/userstats/userstats_interface';
import { ActivityZone, ActivityZoneState, Gender, UserActiveStatus } from '../../core/Utils/enums';

export interface IAuthData{
    authData: {
        google: {
            access_token?: string,
            id?: string,
            id_token?: string,
        }
    }
}

export interface UserData {
    username: string;
    email: string;
    password: string,
    authData: IAuthData,
    lastOnline?: Date;
    user_state_in_app?: UserActiveStatus;
    isreseller?: boolean;
    reseller_coins?: number;
    reseller_whatsAppnumber?: string;
    reseller_history?: any[];
    avatar?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    gender?: Gender;
    birthday?: Date;
    country?: string;
    bio?: string;
    country_code?: string;
    country_dial_code?: string;
    uid: string;
    country_languages?: string[];
    credit?: number;
    userPoints?: number;
    isViewer?: boolean;
    objectId?: string;
    activity_zone?: {
        zone?: ActivityZoneState;
        createdAt?: Date;
        expire?: Date;
    };
    stats?:IUserStats
}

//  Create the document type (instance methods + fields)
export interface IUserDocument extends UserData, Document {
    createdAt: Date;
    updatedAt: Date;
}

// Create the model type (static methods like find, findOne, etc.)
export interface IUserModel extends Model<IUserDocument> {}