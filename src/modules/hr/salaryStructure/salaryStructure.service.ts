import { SalaryStructure, ISalaryStructure } from '../../../models/SalaryStructure';
import { ApiError } from '../../../common/ApiError';

export class SalaryStructureService {
  static async getAll(employeeType?: string, isCurrent?: boolean): Promise<ISalaryStructure[]> {
    const filter: any = {};
    if (employeeType) filter.employeeType = employeeType;
    if (isCurrent !== undefined) filter.isCurrent = isCurrent;
    return SalaryStructure.find(filter).sort({ version: -1 }).populate('createdById', 'firstName lastName');
  }

  static async getById(id: string): Promise<ISalaryStructure> {
    const structure = await SalaryStructure.findById(id).populate('createdById', 'firstName lastName');
    if (!structure) throw ApiError.notFound('Salary structure not found');
    return structure;
  }

  static async getCurrent(employeeType: string): Promise<ISalaryStructure | null> {
    return SalaryStructure.findOne({ employeeType, isCurrent: true });
  }

  static async getDashboard(): Promise<{
    total: number;
    active: number;
    guardStructures: number;
    staffStructures: number;
  }> {
    const [total, active, guardStructures, staffStructures] = await Promise.all([
      SalaryStructure.countDocuments(),
      SalaryStructure.countDocuments({ isCurrent: true }),
      SalaryStructure.countDocuments({ employeeType: 'GUARD' }),
      SalaryStructure.countDocuments({ employeeType: 'STAFF' }),
    ]);
    return { total, active, guardStructures, staffStructures };
  }

  static async create(data: {
    name: string;
    employeeType: 'GUARD' | 'STAFF';
    payBasis: 'HOURLY' | 'MONTHLY';
    effectiveFrom: Date;
    otMultiplier?: number;
    holidayMultiplier?: number;
    earnings: ISalaryStructure['earnings'];
    deductions: ISalaryStructure['deductions'];
    createdById: string;
  }): Promise<ISalaryStructure> {
    const maxVersion = await SalaryStructure.findOne({ employeeType: data.employeeType })
      .sort({ version: -1 })
      .select('version');
    const version = (maxVersion?.version || 0) + 1;

    const structure = await SalaryStructure.create({
      ...data,
      version,
      isCurrent: true,
      createdById: data.createdById,
    });

    return structure;
  }

  static async retire(id: string): Promise<ISalaryStructure> {
    const structure = await SalaryStructure.findById(id);
    if (!structure) throw ApiError.notFound('Salary structure not found');
    if (!structure.isCurrent) throw ApiError.badRequest('Structure is already retired');

    structure.isCurrent = false;
    structure.effectiveTo = new Date();
    await structure.save();
    return structure;
  }

  static async getVersions(employeeType: string): Promise<ISalaryStructure[]> {
    return SalaryStructure.find({ employeeType }).sort({ version: -1 });
  }

  static async duplicate(id: string, createdById: string): Promise<ISalaryStructure> {
    const source = await SalaryStructure.findById(id);
    if (!source) throw ApiError.notFound('Salary structure not found');

    const maxVersion = await SalaryStructure.findOne({ employeeType: source.employeeType })
      .sort({ version: -1 })
      .select('version');
    const version = (maxVersion?.version || 0) + 1;

    const structure = await SalaryStructure.create({
      name: `${source.name} (Copy)`,
      employeeType: source.employeeType,
      payBasis: source.payBasis,
      version,
      isCurrent: true,
      effectiveFrom: new Date(),
      otMultiplier: source.otMultiplier,
      holidayMultiplier: source.holidayMultiplier,
      earnings: source.earnings.map((e) => ({ ...e } as any)),
      deductions: source.deductions.map((d) => ({ ...d } as any)),
      createdById,
    });

    return structure;
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      otMultiplier: number;
      holidayMultiplier: number;
      earnings: ISalaryStructure['earnings'];
      deductions: ISalaryStructure['deductions'];
    }>
  ): Promise<ISalaryStructure> {
    const structure = await SalaryStructure.findById(id);
    if (!structure) throw ApiError.notFound('Salary structure not found');
    if (!structure.isCurrent) throw ApiError.badRequest('Cannot edit a retired structure');

    if (data.name !== undefined) structure.name = data.name;
    if (data.otMultiplier !== undefined) structure.otMultiplier = data.otMultiplier;
    if (data.holidayMultiplier !== undefined) structure.holidayMultiplier = data.holidayMultiplier;
    if (data.earnings !== undefined) structure.earnings = data.earnings;
    if (data.deductions !== undefined) structure.deductions = data.deductions;

    await structure.save();
    return structure;
  }
}
