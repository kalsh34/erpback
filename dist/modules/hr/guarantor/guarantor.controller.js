"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.reject = exports.verify = exports.update = exports.create = exports.getById = exports.getByEmployeeId = void 0;
const guarantor_service_1 = require("./guarantor.service");
const getByEmployeeId = async (req, res, next) => {
    try {
        const data = await guarantor_service_1.GuarantorService.getByEmployeeId(req.params.employeeId);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
exports.getByEmployeeId = getByEmployeeId;
const getById = async (req, res, next) => {
    try {
        const data = await guarantor_service_1.GuarantorService.getById(req.params.id);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
exports.getById = getById;
const create = async (req, res, next) => {
    try {
        const user = req.user;
        const data = await guarantor_service_1.GuarantorService.create(req.body, {
            userId: user._id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
exports.create = create;
const update = async (req, res, next) => {
    try {
        const user = req.user;
        const data = await guarantor_service_1.GuarantorService.update(req.params.id, req.body, {
            userId: user._id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
exports.update = update;
const verify = async (req, res, next) => {
    try {
        const user = req.user;
        const data = await guarantor_service_1.GuarantorService.verify(req.params.id, user._id, {
            userId: user._id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
exports.verify = verify;
const reject = async (req, res, next) => {
    try {
        const user = req.user;
        const data = await guarantor_service_1.GuarantorService.reject(req.params.id, req.body.reason, {
            userId: user._id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
exports.reject = reject;
const remove = async (req, res, next) => {
    try {
        const user = req.user;
        await guarantor_service_1.GuarantorService.delete(req.params.id, {
            userId: user._id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.json({ success: true, message: 'Guarantor deleted' });
    }
    catch (err) {
        next(err);
    }
};
exports.remove = remove;
//# sourceMappingURL=guarantor.controller.js.map