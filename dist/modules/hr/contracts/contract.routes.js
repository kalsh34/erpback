"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contract_controller_1 = require("./contract.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_READ), contract_controller_1.ContractController.getAll);
router.get('/employee/:employeeId', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_READ), contract_controller_1.ContractController.getByEmployee);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_CREATE), contract_controller_1.ContractController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_UPDATE), contract_controller_1.ContractController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_UPDATE), contract_controller_1.ContractController.delete);
exports.default = router;
//# sourceMappingURL=contract.routes.js.map