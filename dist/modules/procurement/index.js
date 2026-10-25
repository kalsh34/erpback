"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_routes_1 = __importDefault(require("./contacts/contact.routes"));
const product_routes_1 = __importDefault(require("./products/product.routes"));
const rfq_routes_1 = __importDefault(require("./rfqs/rfq.routes"));
const po_routes_1 = __importDefault(require("./orders/po.routes"));
const receipt_routes_1 = __importDefault(require("./receipts/receipt.routes"));
const bill_routes_1 = __importDefault(require("./bills/bill.routes"));
const purchaseReport_routes_1 = __importDefault(require("./reports/purchaseReport.routes"));
const purchaseSettings_routes_1 = __importDefault(require("./settings/purchaseSettings.routes"));
const router = (0, express_1.Router)();
router.use('/contacts', contact_routes_1.default);
router.use('/products', product_routes_1.default);
router.use('/rfqs', rfq_routes_1.default);
router.use('/orders', po_routes_1.default);
router.use('/receipts', receipt_routes_1.default);
router.use('/bills', bill_routes_1.default);
router.use('/reports', purchaseReport_routes_1.default);
router.use('/settings', purchaseSettings_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map