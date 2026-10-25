"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("./product.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.PRODUCT_READ), product_controller_1.ProductController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.PRODUCT_READ), product_controller_1.ProductController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.PRODUCT_MANAGE), product_controller_1.ProductController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.PRODUCT_MANAGE), product_controller_1.ProductController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.PRODUCT_MANAGE), product_controller_1.ProductController.delete);
exports.default = router;
//# sourceMappingURL=product.routes.js.map