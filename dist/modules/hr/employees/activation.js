"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivationRequirements = getActivationRequirements;
exports.describeMissingRequirements = describeMissingRequirements;
exports.activateEmployeeIfEligible = activateEmployeeIfEligible;
const Employee_1 = require("../../../models/Employee");
const Contract_1 = require("../../../models/Contract");
const Guarantor_1 = require("../../../models/Guarantor");
const types_1 = require("../../../types");
async function getActivationRequirements(employeeId) {
    const [activeContract, verifiedGuarantor] = await Promise.all([
        Contract_1.Contract.exists({ employeeId, status: 'ACTIVE' }),
        Guarantor_1.Guarantor.exists({ employeeId, verificationStatus: Guarantor_1.GuarantorVerificationStatus.VERIFIED }),
    ]);
    return {
        hasActiveContract: !!activeContract,
        hasVerifiedGuarantor: !!verifiedGuarantor,
    };
}
function describeMissingRequirements(requirements) {
    const missing = [];
    if (!requirements.hasActiveContract)
        missing.push('an active contract');
    if (!requirements.hasVerifiedGuarantor)
        missing.push('a verified guarantor');
    return missing.join(' and ');
}
/** Promotes the employee to ACTIVE as soon as every requirement is satisfied. */
async function activateEmployeeIfEligible(employeeId) {
    const employee = await Employee_1.Employee.findById(employeeId);
    if (!employee || employee.status === types_1.EmployeeStatus.ACTIVE)
        return;
    const requirements = await getActivationRequirements(employeeId);
    if (requirements.hasActiveContract && requirements.hasVerifiedGuarantor) {
        employee.status = types_1.EmployeeStatus.ACTIVE;
        await employee.save();
    }
}
//# sourceMappingURL=activation.js.map