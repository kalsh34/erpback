"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollConfigService = void 0;
const GuardPayrollConfig_1 = require("../../models/GuardPayrollConfig");
const ApiError_1 = require("../../common/ApiError");
/**
 * GUARD PAYROLL CONFIG SERVICE — singleton configuration for the engine.
 * Defaults: transport 20%, OT divisor 240, Sunday structural 32h, basic
 * hourly divisor 208. All values are configurable so the owner can change
 * the effective rates later without code changes.
 */
class GuardPayrollConfigService {
    /** Fetch the singleton, creating it with defaults on first use. */
    static async get() {
        const existing = await GuardPayrollConfig_1.GuardPayrollConfig.findOne({ key: 'default' });
        if (existing)
            return existing;
        return GuardPayrollConfig_1.GuardPayrollConfig.create({ key: 'default' });
    }
    static async update(patch) {
        const checks = [
            ['transportPercent', 'Transport percentage', 0, 100],
            ['standardMonthlyHours', 'Standard monthly hours', 1, 744],
            ['sundayStructuralHours', 'Sunday structural hours', 0, 200],
            ['basicHourlyDivisor', 'Basic hourly divisor', 1, 744],
        ];
        for (const [key, label, min, max] of checks) {
            const value = patch[key];
            if (value === undefined)
                continue;
            if (typeof value !== 'number' || !Number.isFinite(value))
                throw ApiError_1.ApiError.badRequest(`${label} must be a number`);
            if (value < min || value > max)
                throw ApiError_1.ApiError.badRequest(`${label} must be between ${min} and ${max}`);
        }
        const config = await this.get();
        if (patch.transportPercent !== undefined)
            config.transportPercent = patch.transportPercent;
        if (patch.standardMonthlyHours !== undefined)
            config.standardMonthlyHours = patch.standardMonthlyHours;
        if (patch.sundayStructuralHours !== undefined)
            config.sundayStructuralHours = patch.sundayStructuralHours;
        if (patch.basicHourlyDivisor !== undefined)
            config.basicHourlyDivisor = patch.basicHourlyDivisor;
        config.updatedBy = patch.userId;
        await config.save();
        return config;
    }
    /** Plain numbers for the pure engine. */
    static async getNumbers() {
        const config = await this.get();
        return {
            transportPercent: config.transportPercent,
            standardMonthlyHours: config.standardMonthlyHours,
            sundayStructuralHours: config.sundayStructuralHours,
            basicHourlyDivisor: config.basicHourlyDivisor,
        };
    }
}
exports.GuardPayrollConfigService = GuardPayrollConfigService;
//# sourceMappingURL=guardPayrollConfig.service.js.map