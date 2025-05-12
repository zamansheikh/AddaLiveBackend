import { ActivityZone,  Avatar, IUserEntity } from "./user_entity_interface";

class UserEntity {
    username: string;
    email: string;
    password: string;
    lastOnline?: Date;
    userStateInApp: "Online" | "Offline";
    isReseller: boolean;
    resellerCoins: number;
    resellerWhatsAppNumber: string;
    resellerHistory: any[];
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
    uid: number;
    countryLanguages: string[];
    credit: number;
    userPoints: number;
    isViewer: boolean;
    objectId?: string;
    activityZone: ActivityZone;

    constructor(data: IUserEntity) {
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.lastOnline = data.lastOnline;
        this.userStateInApp = data.userStateInApp || "Offline";
        this.isReseller = data.isReseller || false;
        this.resellerCoins = data.resellerCoins || 0;
        this.resellerWhatsAppNumber = data.resellerWhatsAppNumber || "";
        this.resellerHistory = data.resellerHistory || [];
        this.avatar = data.avatar;
        this.name = data.name;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.gender = data.gender;
        this.birthday = data.birthday;
        this.country = data.country;
        this.bio = data.bio;
        this.countryCode = data.countryCode;
        this.countryDialCode = data.countryDialCode;
        this.uid = data.uid;
        this.countryLanguages = data.countryLanguages || [];
        this.credit = data.credit || 0;
        this.userPoints = data.userPoints || 0;
        this.isViewer = data.isViewer || false;
        this.objectId = data.objectId;
        this.activityZone = {
            zone: data.activityZone?.zone || "safe",
            createdAt: data.activityZone?.createdAt,
            expire: data.activityZone?.expire,
        };
    }
}


export default UserEntity;