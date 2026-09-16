import mongoose, { Document } from 'mongoose';
export declare enum OrganizationType {
    COMPANY = "COMPANY",
    BRANCH = "BRANCH",
    DEPARTMENT = "DEPARTMENT",
    COST_CENTER = "COST_CENTER"
}
export interface IOrganization extends Document {
    name: string;
    code: string;
    type: OrganizationType;
    parentId?: mongoose.Types.ObjectId;
    companyId?: mongoose.Types.ObjectId;
    manager?: mongoose.Types.ObjectId;
    description?: string;
    employeeCodePrefix?: string;
    nextEmployeeCode?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Organization: mongoose.Model<IOrganization, {}, {}, {}, mongoose.Document<unknown, {}, IOrganization, {}, {}> & IOrganization & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Organization.d.ts.map