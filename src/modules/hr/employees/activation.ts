import { Employee } from '../../../models/Employee';
import { Contract } from '../../../models/Contract';
import { Guarantor, GuarantorVerificationStatus } from '../../../models/Guarantor';
import { EmployeeStatus } from '../../../types';

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

export async function getActivationRequirements(employeeId: string): Promise<ActivationRequirements> {
  const [activeContract, verifiedGuarantor] = await Promise.all([
    Contract.exists({ employeeId, status: 'ACTIVE' }),
    Guarantor.exists({ employeeId, verificationStatus: GuarantorVerificationStatus.VERIFIED }),
  ]);

  return {
    hasActiveContract: !!activeContract,
    hasVerifiedGuarantor: !!verifiedGuarantor,
  };
}

export function describeMissingRequirements(requirements: ActivationRequirements): string {
  const missing: string[] = [];
  if (!requirements.hasActiveContract) missing.push('an active contract');
  if (!requirements.hasVerifiedGuarantor) missing.push('a verified guarantor');
  return missing.join(' and ');
}

/** Promotes the employee to ACTIVE as soon as every requirement is satisfied. */
export async function activateEmployeeIfEligible(employeeId: string): Promise<void> {
  const employee = await Employee.findById(employeeId);
  if (!employee || employee.status === EmployeeStatus.ACTIVE) return;

  const requirements = await getActivationRequirements(employeeId);
  if (requirements.hasActiveContract && requirements.hasVerifiedGuarantor) {
    employee.status = EmployeeStatus.ACTIVE;
    await employee.save();
  }
}
