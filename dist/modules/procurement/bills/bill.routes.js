"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bill_controller_1 = require("./bill.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), bill_controller_1.BillController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), bill_controller_1.BillController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.BILL_MANAGE), bill_controller_1.BillController.create);
router.post('/:id/post', (0, rbac_1.authorize)(types_1.PERMISSIONS.BILL_MANAGE), bill_controller_1.BillController.postBill);
router.post('/:id/payments', (0, rbac_1.authorize)(types_1.PERMISSIONS.BILL_MANAGE), bill_controller_1.BillController.recordPayment);
exports.default = router;
//# sourceMappingURL=bill.routes.js.map