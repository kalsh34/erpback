"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_controller_1 = require("./contact.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.CONTACT_READ), contact_controller_1.ContactController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.CONTACT_READ), contact_controller_1.ContactController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.CONTACT_MANAGE), contact_controller_1.ContactController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.CONTACT_MANAGE), contact_controller_1.ContactController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.CONTACT_MANAGE), contact_controller_1.ContactController.delete);
exports.default = router;
//# sourceMappingURL=contact.routes.js.map