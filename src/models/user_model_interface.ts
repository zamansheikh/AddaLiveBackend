import mongoose, { Document, Model } from 'mongoose';

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
    user_state_in_app?: 'Online' | 'Offline';
    isreseller?: boolean;
    reseller_coins?: number;
    reseller_whatsAppnumber?: string;
    reseller_history?: any[];
    avatar?: {
        name?: string;
        url?: string;
    };
    name?: string;
    first_name?: string;
    last_name?: string;
    gender?: 'male' | 'female' | 'other';
    birthday?: Date;
    country?: string;
    bio?: string;
    country_code?: string;
    country_dial_code?: string;
    uid: number;
    country_languages?: string[];
    credit?: number;
    userPoints?: number;
    isViewer?: boolean;
    objectId?: string;
    activity_zone?: {
        zone?: 'safe' | 'temp_block' | 'permanent_block';
        createdAt?: Date;
        expire?: Date;
    };
}

//  Create the document type (instance methods + fields)
export interface IUserDocument extends UserData, Document {
    createdAt: Date;
    updatedAt: Date;
}

// Create the model type (static methods like find, findOne, etc.)
export interface IUserModel extends Model<IUserDocument> {}