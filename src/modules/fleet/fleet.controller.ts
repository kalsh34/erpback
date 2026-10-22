import { Request, Response, NextFunction } from 'express';
import { FleetService } from './fleet.service';
import { VehicleStatus } from './fleet.models';

const auditCtx = (req: Request) => ({ ip: req.ip, ua: req.get('user-agent') });
const userId = (req: Request) => req.user?.userId || '';

export class FleetController {
  static async listVehicles(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.listVehicles(req.query as any) }); }
    catch (error) { next(error); }
  }

  static async getVehicle(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.getVehicle(req.params.id) }); }
    catch (error) { next(error); }
  }

  static async createVehicle(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await FleetService.createVehicle(req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.updateVehicle(req.params.id, req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async setVehicleStatus(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.setVehicleStatus(req.params.id, req.body?.status as VehicleStatus, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async listDrivers(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.listDrivers(req.query as any) }); }
    catch (error) { next(error); }
  }

  static async createDriver(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await FleetService.createDriver(req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async updateDriver(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.updateDriver(req.params.id, req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async listAssignments(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.listAssignments(req.query as any) }); }
    catch (error) { next(error); }
  }

  static async createAssignment(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await FleetService.createAssignment(req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async endAssignment(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.endAssignment(req.params.id, req.body?.effectiveTo, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async listMaintenance(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.listMaintenance(req.query as any) }); }
    catch (error) { next(error); }
  }

  static async createMaintenance(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await FleetService.createMaintenance(req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async updateMaintenance(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.updateMaintenance(req.params.id, req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async listDocuments(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.listDocuments(req.params.vehicleId) }); }
    catch (error) { next(error); }
  }

  static async createDocument(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await FleetService.createDocument(req.body, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.deleteDocument(req.params.id, userId(req), auditCtx(req)) }); }
    catch (error) { next(error); }
  }

  static async scanExpiry(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await FleetService.scanDocumentExpiry(userId(req)) }); }
    catch (error) { next(error); }
  }
}
