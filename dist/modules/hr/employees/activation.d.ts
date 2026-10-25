/**
 * An employee may only become ACTIVE once the paperwork is complete:
 *   1. an ACTIVE contract, and
 *   2. a VERIFIED guarantor.
 *
 * The rule is enforced in two directions:
 *  - activateEmployeeIfEligible() is called after a contract or a guarantor
 *    changes, so the employee is promoted automatically the moment both exist.
 *  - EmployeeService.changeStatus() refuses a manual move to ACTIVE while a
 *    requirement is still missing.
 */
export interface ActivationRequirements {
    hasActiveContract: boolean;
    hasVerifiedGuarantor: boolean;
}
export declare function getActivationRequirements(employeeId: string): Promise<ActivationRequirements>;
export declare function describeMissingRequirements(requirements: ActivationRequirements): string;
/** Promotes the employee to ACTIVE as soon as every requirement is satisfied. */
export declare function activateEmployeeIfEligible(employeeId: string): Promise<void>;
//# sourceMappingURL=activation.d.ts.map