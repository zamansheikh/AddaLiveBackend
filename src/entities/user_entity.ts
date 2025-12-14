import { ActivityZone,  Avatar, IUserEntity } from "./user_entity_interface";

class UserEntity {
    id: string;
    username: string;
    userId: number;
    premiumId?: number;
    email: string;
    phone?: string;
    password: string;
    lastOnline?: Date;
    userStateInApp: "Online" | "Offline";
    isReseller: boolean;
    resellerCoins: number;
    resellerWhatsAppNumber: string;
    resellerHistory: any[];
    avatar?: Avatar;
    name?: string;
    nameUpdateDate?: Date;
    firstName?: string;
    lastName?: string;
    gender?: "male" | "female" | "other";
    birthday?: Date;
    country?: string;
    bio?: string;
    countryCode?: string;
    countryDialCode?: string;
    uid: string;
    countryLanguages: string[];
    credit: number;
    userPoints: number;
    isViewer: boolean;
    objectId?: string;
    activityZone: ActivityZone;
    verified: boolean;

    constructor(data: IUserEntity) {
        this.id = data.id;
        this.username = data.username;
        this.userId = data.userId;
        this.premiumId = data.premiumId;
        this.email = data.email;
        this.phone = data.phone;
        this.password = data.password;
        this.lastOnline = data.lastOnline;
        this.userStateInApp = data.userStateInApp || "Offline";
        this.isReseller = data.isReseller || false;
        this.resellerCoins = data.resellerCoins || 0;
        this.resellerWhatsAppNumber = data.resellerWhatsAppNumber || "";
        this.resellerHistory = data.resellerHistory || [];
        this.avatar = data.avatar;
        this.name = data.name;
        this.nameUpdateDate = data.nameUpdateDate;
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
        this.verified = data.verified || false;
    }

    static fromJson(json: any): UserEntity {
        return new UserEntity({
            id: json._id,
            username: json.username,
            userId: json.userId,
            premiumId: json.premiumId,
            email: json.email,
            phone: json.phone,
            password: json.password,
            lastOnline: json.lastOnline ? new Date(json.lastOnline) : undefined,
            userStateInApp: json.userStateInApp,
            isReseller: json.isReseller,
            resellerCoins: json.resellerCoins,
            resellerWhatsAppNumber: json.resellerWhatsAppNumber,
            resellerHistory: json.resellerHistory,
            avatar: json.avatar,
            name: json.name,
            nameUpdateDate: json.nameUpdateDate
                ? new Date(json.nameUpdateDate)
                : undefined,
            firstName: json.firstName,
            lastName: json.lastName,
            gender: json.gender,
            birthday: json.birthday ? new Date(json.birthday) : undefined,
            country: json.country,
            bio: json.bio,
            countryCode: json.countryCode,
            countryDialCode: json.countryDialCode,
            uid: json.uid,
            countryLanguages: json.countryLanguages,
            credit: json.credit,
            userPoints: json.userPoints,
            isViewer: json.isViewer,
            objectId: json.objectId,
            activityZone: json.activityZone
                ? {
                      zone: json.activityZone.zone,
                      createdAt: json.activityZone.createdAt
                          ? new Date(json.activityZone.createdAt)
                          : undefined,
                      expire: json.activityZone.expire
                          ? new Date(json.activityZone.expire)
                          : undefined,
                  }
                : undefined,
                verified: json.verified,
        });
    }
}


export default UserEntity;