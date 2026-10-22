import { Request, Response, NextFunction } from 'express';
export declare class FleetController {
    static listVehicles(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getVehicle(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createVehicle(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void>;
    static setVehicleStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listDrivers(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createDriver(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateDriver(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listAssignments(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createAssignment(req: Request, res: Response, next: NextFunction): Promise<void>;
    static endAssignment(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listMaintenance(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createMaintenance(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateMaintenance(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listDocuments(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createDocument(req: Request, res: Response, next: NextFunction): Promise<void>;
    static deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void>;
    static scanExpiry(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=fleet.controller.d.ts.map