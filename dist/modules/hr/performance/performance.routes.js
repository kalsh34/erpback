"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const performance_controller_1 = require("./performance.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/stats', (0, rbac_1.authorize)(types_1.PERMISSIONS.PERFORMANCE_READ), performance_controller_1.PerformanceController.getStats);
router.get('/top-performers', (0, rbac_1.authorize)(types_1.PERMISSIONS.PERFORMANCE_READ), performance_controller_1.PerformanceController.getTopPerformers);
router.get('/reviews-due', (0, rbac_1.authorize)(types_1.PERMISSIONS.PERFORMANCE_READ), performance_controller_1.PerformanceController.getReviewsDue);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.PERFORMANCE_READ), performance_controller_1.PerformanceController.getAll);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.PERFORMANCE_MANAGE), performance_controller_1.PerformanceController.createOrUpdate);
exports.default = router;
//# sourceMappingURL=performance.routes.js.map