import { IFamilyMember, IFamilyMemberDocument, IFamilyMemberModel } from "../../models/family/family_member_model";

export interface IFamilyMemberRepository {
  create(data: IFamilyMember, session?: any): Promise<IFamilyMemberDocument>;
  getByUserId(userId: string): Promise<IFamilyMemberDocument | null>;
  update(
    userId: string,
    data: Partial<IFamilyMember>,
  ): Promise<IFamilyMemberDocument | null>;
  countByRole(familyId: string | any, role: string): Promise<number>;
  incrementContribution(
    userId: string,
    familyId: string,
    amount: number,
  ): Promise<void>;
  getTopContributors(
    familyId: string,
    limit: number,
  ): Promise<IFamilyMemberDocument[]>;
}

export class FamilyMemberRepository implements IFamilyMemberRepository {
  model: IFamilyMemberModel;

  constructor(model: IFamilyMemberModel) {
    this.model = model;
  }
  async create(
    data: IFamilyMember,
    session?: any,
  ): Promise<IFamilyMemberDocument> {
    const familyMember = new this.model(data);
    return await familyMember.save({ session });
  }
  async getByUserId(userId: string): Promise<IFamilyMemberDocument | null> {
    return await this.model.findOne({ userId });
  }

  async update(
    userId: string,
    data: Partial<IFamilyMember>,
  ): Promise<IFamilyMemberDocument | null> {
    return await this.model.findOneAndUpdate({ userId }, data, { new: true });
  }

  async countByRole(familyId: string | any, role: string): Promise<number> {
    return await this.model.countDocuments({ familyId, role });
  }

  async incrementContribution(
    userId: string,
    familyId: string,
    amount: number,
  ): Promise<void> {
    await this.model.updateOne(
      { userId, familyId },
      { $inc: { giftsReceived: amount } },
    );
  }

  async getTopContributors(
    familyId: string,
    limit: number,
  ): Promise<IFamilyMemberDocument[]> {
    return await this.model
      .find({ familyId })
      .sort({ giftsReceived: -1 })
      .limit(limit)
      .populate("userId", "name _id avatar");
  }
}