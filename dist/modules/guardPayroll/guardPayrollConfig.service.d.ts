import { IGuardPayrollConfig } from '../../models/GuardPayrollConfig';
/**
 * GUARD PAYROLL CONFIG SERVICE — singleton configuration for the engine.
 * Defaults: transport 20%, OT divisor 240, Sunday structural 32h, basic
 * hourly divisor 208. All values are configurable so the owner can change
 * the effective rates later without code changes.
 */
export declare class GuardPayrollConfigService {
    /** Fetch the singleton, creating it with defaults on first use. */
    static get(): Promise<IGuardPayrollConfig>;
    static update(patch: {
        transportPercent?: number;
        standardMonthlyHours?: number;
        sundayStructuralHours?: number;
        basicHourlyDivisor?: number;
        userId: string;
    }): Promise<IGuardPayrollConfig>;
    /** Plain numbers for the pure engine. */
    static getNumbers(): Promise<{
        transportPercent: number;
        standardMonthlyHours: number;
        sundayStructuralHours: number;
        basicHourlyDivisor: number;
    }>;
}
//# sourceMappingURL=guardPayrollConfig.service.d.ts.map