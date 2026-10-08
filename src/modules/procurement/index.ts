import { Router } from 'express';
import contactRoutes from './contacts/contact.routes';
import productRoutes from './products/product.routes';
import rfqRoutes from './rfqs/rfq.routes';
import poRoutes from './orders/po.routes';
import receiptRoutes from './receipts/receipt.routes';
import billRoutes from './bills/bill.routes';
import purchaseReportRoutes from './reports/purchaseReport.routes';
import purchaseSettingsRoutes from './settings/purchaseSettings.routes';

const router = Router();

router.use('/contacts', contactRoutes);
router.use('/products', productRoutes);
router.use('/rfqs', rfqRoutes);
router.use('/orders', poRoutes);
router.use('/receipts', receiptRoutes);
router.use('/bills', billRoutes);
router.use('/reports', purchaseReportRoutes);
router.use('/settings', purchaseSettingsRoutes);

export default router;
