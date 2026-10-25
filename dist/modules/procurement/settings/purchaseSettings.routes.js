"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchaseSettings_controller_1 = require("./purchaseSettings.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_READ), purchaseSettings_controller_1.PurchaseSettingsController.get);
router.put('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), purchaseSettings_controller_1.PurchaseSettingsController.update);
exports.default = router;
//# sourceMappingURL=purchaseSettings.routes.js.map