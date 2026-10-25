"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidate_controller_1 = require("./candidate.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/stats', (0, rbac_1.authorize)(types_1.PERMISSIONS.CANDIDATE_READ), candidate_controller_1.CandidateController.getStats);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.CANDIDATE_READ), candidate_controller_1.CandidateController.getAll);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.CANDIDATE_MANAGE), candidate_controller_1.CandidateController.create);
router.put('/:id/stage', (0, rbac_1.authorize)(types_1.PERMISSIONS.CANDIDATE_MANAGE), candidate_controller_1.CandidateController.updateStage);
router.put('/:id/reject', (0, rbac_1.authorize)(types_1.PERMISSIONS.CANDIDATE_MANAGE), candidate_controller_1.CandidateController.reject);
exports.default = router;
//# sourceMappingURL=candidate.routes.js.map