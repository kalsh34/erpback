"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rules_controller_1 = require("./rules.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/tax-brackets', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_READ), rules_controller_1.RulesController.getTaxBrackets);
router.get('/tax-brackets/current', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_READ), rules_controller_1.RulesController.getCurrentTaxBracket);
router.post('/tax-brackets', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), rules_controller_1.RulesController.createTaxBracket);
router.get('/pension-rules', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_READ), rules_controller_1.RulesController.getPensionRules);
router.get('/pension-rules/current', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_READ), rules_controller_1.RulesController.getCurrentPensionRule);
router.post('/pension-rules', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), rules_controller_1.RulesController.createPensionRule);
exports.default = router;
//# sourceMappingURL=rules.routes.js.map