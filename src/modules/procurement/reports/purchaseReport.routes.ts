import { Router } from 'express';
import { PurchaseReportController } from './purchaseReport.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/dashboard', authorize(PERMISSIONS.PURCHASE_READ), PurchaseReportController.getDashboard);
router.get('/po-summary', authorize(PERMISSIONS.PURCHASE_READ), PurchaseReportController.getPOSummary);
router.get('/supplier-spend', authorize(PERMISSIONS.PURCHASE_READ), PurchaseReportController.getSupplierSpend);
router.get('/price-history', authorize(PERMISSIONS.PURCHASE_READ), PurchaseReportController.getProductPriceHistory);
router.get('/outstanding', authorize(PERMISSIONS.PURCHASE_READ), PurchaseReportController.getOutstanding);
router.get('/spend-analysis', authorize(PERMISSIONS.PURCHASE_READ), PurchaseReportController.getSpendAnalysis);

export default router;
