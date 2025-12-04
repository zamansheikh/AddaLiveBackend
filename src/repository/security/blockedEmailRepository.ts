import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IBlockedEmailDocument, IBlockedEmailModel } from "../../models/security/blocked_emails";

export interface IBlockedEmailRepository {
    getAllEmails(): Promise<IBlockedEmailDocument[]>;
    checkBlockedEmail(email: string): Promise<boolean>;
    deleteEmail(id: string): Promise<IBlockedEmailDocument>;
    addEmail(email: string): Promise<IBlockedEmailDocument>;
    getAllEmailsFlat(): Promise<string[]>;
}


export class BlockedEmailRepository implements IBlockedEmailRepository {
    Model: IBlockedEmailModel;

    constructor(model: IBlockedEmailModel) {
        this.Model = model;
    }

    async getAllEmails(): Promise<IBlockedEmailDocument[]> {
        return this.Model.find();
    }

    async deleteEmail(id: string): Promise<IBlockedEmailDocument> {
        const deletedEmail = await this.Model.findByIdAndDelete(id);
        if (!deletedEmail) {
            throw new AppError(StatusCodes.NOT_FOUND, "Email not found")
        }
        return deletedEmail;
    }

    async addEmail(email: string): Promise<IBlockedEmailDocument> {
        const newEmail = new this.Model({ email });
        return await newEmail.save();
    }

    async getAllEmailsFlat(): Promise<string[]> {
        const emails = await this.Model.find({}, { email: 1, _id: 0 });
        return emails.map(emailDoc => emailDoc.email);
    }

    async checkBlockedEmail(email: string): Promise<boolean> {
        const blockedEmail = await this.Model.findOne({ email });
        return !!blockedEmail;
    }
}