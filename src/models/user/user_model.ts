import mongoose from "mongoose";
import { IUserDocument } from "../user/user_model_interface";
import { ActivityZoneState, DatabaseNames, Gender, UserActiveStatus, UserRoles } from "../../core/Utils/enums";

const userSchema = new mongoose.Schema<IUserDocument>(
    {
        username: { type: String, required: false },
        email: { type: String, required: true },
        password: { type: String, required: true },
        lastOnline: { type: Date },
        user_state_in_app: {
            type: String,
            enum: UserActiveStatus,
            default: UserActiveStatus.offline,
        },
        avatar: { type: String },
        name: String,
        first_name: String,
        last_name: String,
        gender: { type: String, enum: Gender },
        birthday: { type: Date },
        country: String,
        bio: String,
        country_code: String,
        country_dial_code: String,
        uid: { type: String, required: true, unique: true, index: true },
        userRole: {
            type: String,
            enum: UserRoles,
            default: UserRoles.User,
        },
        country_languages: [String],
        isViewer: { type: Boolean, default: false },
        objectId: String,
        activity_zone: {
            zone: {
                type: String,
                enum: ActivityZoneState,
                default: ActivityZoneState.safe,
            },
            createdAt: { type: Date },
            expire: { type: Date },
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model(DatabaseNames.User, userSchema, DatabaseNames.User);

export default User;
