"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalController = void 0;
const journal_service_1 = require("./journal.service");
class JournalController {
    static async createEntry(req, res, next) {
        try {
            const entry = await journal_service_1.JournalService.createEntry({
                ...req.body,
                userId: req.user._id,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: entry });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAll(req, res, next) {
        try {
            const result = await journal_service_1.JournalService.getAll(req.query);
            res.json({ success: true, ...result });
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const entry = await journal_service_1.JournalService.getById(req.params.id);
            res.json({ success: true, data: entry });
        }
        catch (err) {
            next(err);
        }
    }
    static async voidEntry(req, res, next) {
        try {
            const entry = await journal_service_1.JournalService.voidEntry(req.params.id, req.body.reason, req.user._id, { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: entry });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAccountSummary(req, res, next) {
        try {
            const summary = await journal_service_1.JournalService.getAccountSummary(req.query);
            res.json({ success: true, data: summary });
        }
        catch (err) {
            next(err);
        }
    }
    static async getDashboardSummary(_req, res, next) {
        try {
            const summary = await journal_service_1.JournalService.getDashboardSummary();
            res.json({ success: true, data: summary });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.JournalController = JournalController;
//# sourceMappingURL=journal.controller.js.map