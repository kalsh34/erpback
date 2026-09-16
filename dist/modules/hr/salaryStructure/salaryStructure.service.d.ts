import { ISalaryStructure } from '../../../models/SalaryStructure';
export declare class SalaryStructureService {
    static getAll(employeeType?: string, isCurrent?: boolean): Promise<ISalaryStructure[]>;
    static getById(id: string): Promise<ISalaryStructure>;
    static getCurrent(employeeType: string): Promise<ISalaryStructure | null>;
    static getDashboard(): Promise<{
        total: number;
        active: number;
        guardStructures: number;
        staffStructures: number;
    }>;
    static create(data: {
        name: string;
        employeeType: 'GUARD' | 'STAFF';
        payBasis: 'HOURLY' | 'MONTHLY';
        effectiveFrom: Date;
        otMultiplier?: number;
        holidayMultiplier?: number;
        earnings: ISalaryStructure['earnings'];
        deductions: ISalaryStructure['deductions'];
        createdById: string;
    }): Promise<ISalaryStructure>;
    static retire(id: string): Promise<ISalaryStructure>;
    static getVersions(employeeType: string): Promise<ISalaryStructure[]>;
    static duplicate(id: string, createdById: string): Promise<ISalaryStructure>;
    static update(id: string, data: Partial<{
        name: string;
        otMultiplier: number;
        holidayMultiplier: number;
        earnings: ISalaryStructure['earnings'];
        deductions: ISalaryStructure['deductions'];
    }>): Promise<ISalaryStructure>;
}
//# sourceMappingURL=salaryStructure.service.d.ts.map