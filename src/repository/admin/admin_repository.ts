import { IAdmin, IAdminDocument, IAdminModel } from "../../entities/admin/admin_interface";

export interface IAdminRepository {
    createAdmin(admin: IAdmin): Promise<IAdminDocument>;
    getAdminById(id: string): Promise<IAdminDocument | null>;
    getAdminByUsername(username: string): Promise<IAdminDocument | null>;
    getAdminByEmail(email: string): Promise<IAdminDocument | null>;
    updateAdmin(id: string, admin: Partial<IAdmin>): Promise<IAdminDocument | null>;
    deleteAdmin(id: string): Promise<IAdminDocument | null>;
    getAdmin(): Promise<IAdminDocument | null>;
}


export default class AdminRepository implements IAdminRepository {
    Model: IAdminModel;

    constructor(model: IAdminModel) {
        this.Model = model;
    }

    async createAdmin(admin: IAdmin): Promise<IAdminDocument> {
        const newAdmin = new this.Model(admin);
        return await newAdmin.save();
    }

    async getAdminById(id: string): Promise<IAdminDocument | null> {
        return this.Model.findById(id).select("-password");
    }

    async getAdminByUsername(username: string): Promise<IAdminDocument | null> {
        return this.Model.findOne({ username });
    }

    async getAdminByEmail(email: string): Promise<IAdminDocument | null> {
        return this.Model.findOne({ email }).select("-password");
    }

    async updateAdmin(id: string, admin: Partial<IAdmin>): Promise<IAdminDocument | null> {
        return this.Model.findByIdAndUpdate(id, admin, { new: true }).select("-password");
    }

    async deleteAdmin(id: string): Promise<IAdminDocument | null> {
        return this.Model.findByIdAndDelete(id).select("-password");
    }

    async getAdmin(): Promise<IAdminDocument | null> {
        return this.Model.findOne().select("-password");
    }

}