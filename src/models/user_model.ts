import mongoose from "mongoose";
import { IUserDocument } from "./user_model_interface";

const userSchema = new mongoose.Schema<IUserDocument>(
    {
        username: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        lastOnline: { type: Date },
        user_state_in_app: {
            type: String,
            enum: ["Online", "Offline"],
            default: "Offline",
        },
        isreseller: { type: Boolean, default: false },
        reseller_coins: { type: Number, default: 0 },
        reseller_whatsAppnumber: { type: String, default: "" },
        //   todo: update the date
        reseller_history: { type: [mongoose.Schema.Types.Mixed], default: [] },
        avatar: {
            name: String,
            url: String,
        },
        name: String,
        first_name: String,
        last_name: String,
        gender: { type: String, enum: ["male", "female", "other"] },
        birthday: { type: Date },
        country: String,
        bio: String,
        country_code: String,
        country_dial_code: String,
        uid: {type: Number, required: true, unique: true},
        country_languages: [String],
        credit: { type: Number, default: 0 },
        userPoints: { type: Number, default: 0 },
        isViewer: { type: Boolean, default: false },
        objectId: String,

        activity_zone: {
            zone: {
                type: String,
                enum: ["safe", "temp_block", "permanent_block"],
                default: "safe",
            },
            createdAt: { type: Date },
            expire: { type: Date },
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;
