"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const receipt_controller_1 = require("./receipt.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), receipt_controller_1.ReceiptController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.PURCHASE_READ), receipt_controller_1.ReceiptController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.GRN_MANAGE), receipt_controller_1.ReceiptController.create);
exports.default = router;
//# sourceMappingURL=receipt.routes.js.map