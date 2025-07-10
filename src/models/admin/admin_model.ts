import mongoose from "mongoose";
import { DatabaseNames, UserRoles } from "../../core/Utils/enums";
import { IAdminDocument } from "../../entities/admin/admin_interface";

const adminSchema = new mongoose.Schema<IAdminDocument>({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    userRole: { type: String, default: UserRoles.Admin},
    coins: {type: Number, default: 0},
}, {
    timestamps: true,
});

const Admin = mongoose.model(DatabaseNames.Admin, adminSchema, DatabaseNames.Admin);

export default Admin;
