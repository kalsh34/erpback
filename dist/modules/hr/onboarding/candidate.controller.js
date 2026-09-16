"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateController = void 0;
const candidate_service_1 = require("./candidate.service");
class CandidateController {
    static async getAll(req, res, next) {
        try {
            const { stage, page, limit } = req.query;
            const result = await candidate_service_1.CandidateService.getAll({
                stage: stage,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 50,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const candidate = await candidate_service_1.CandidateService.getById(req.params.id);
            res.json({ success: true, data: candidate });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const candidate = await candidate_service_1.CandidateService.create(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: candidate });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStage(req, res, next) {
        try {
            const { stage, notes } = req.body;
            const candidate = await candidate_service_1.CandidateService.updateStage(req.params.id, stage, notes, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: candidate });
        }
        catch (error) {
            next(error);
        }
    }
    static async reject(req, res, next) {
        try {
            const { reason } = req.body;
            const candidate = await candidate_service_1.CandidateService.reject(req.params.id, reason, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: candidate });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStats(_req, res, next) {
        try {
            const stats = await candidate_service_1.CandidateService.getStats();
            res.json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CandidateController = CandidateController;
//# sourceMappingURL=candidate.controller.js.map