/**
 * QA PROCUREMENT E2E — drives the real local backend with real data:
 * suppliers -> products -> RFQ (quote, approve/reject) -> PO (approve/reject)
 * -> GRN (partial receipt) -> bill (post, partial + full payment), plus guard
 * cases for invalid transitions.
 * Evidence: .qa-artifacts/procurement-e2e.json
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE || 'http://127.0.0.1:5000';
const LOGIN = { email: 'admin@vitalpayroll.com', password: 'password123' };
const stamp = Date.now().toString().slice(-6);

let token = null;
const results = [];
const record = (id, scenario, expected, actual, ok, detail) =>
  results.push({ id, scenario, expected, actual, status: ok ? 'PASS' : 'FAIL', detail: detail || '' });

async function api(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = {};
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json, data: json.data };
}

const ok2xx = (s) => s >= 200 && s < 300;

async function expectOk(id, scenario, method, url, body) {
  const r = await api(method, url, body);
  const ok = ok2xx(r.status);
  record(id, scenario, '2xx', `HTTP ${r.status} ${r.json.message || ''}`.trim(), ok, ok ? '' : JSON.stringify(r.json).slice(0, 300));
  return r;
}

async function expectFail(id, scenario, expectedStatus, method, url, body) {
  const r = await api(method, url, body);
  const ok = r.status === expectedStatus;
  record(id, scenario, `HTTP ${expectedStatus}`, `HTTP ${r.status} ${r.json.message || ''}`.trim(), ok, ok ? '' : JSON.stringify(r.json).slice(0, 300));
  return r;
}

(async () => {
  // ---------- auth ----------
  const login = await api('POST', '/api/auth/login', LOGIN);
  if (!ok2xx(login.status)) {
    console.error('Cannot log in:', login.status, JSON.stringify(login.json));
    process.exit(1);
  }
  token = login.data.accessToken || login.data.token;
  record('AUTH', 'admin login', '2xx', `HTTP ${login.status}`, true);

  // ---------- suppliers ----------
  const supA = await expectOk('SUP-1', 'create supplier (manufacturer)', 'POST', '/api/v2/procurement/contacts', {
    name: `Amhara Tactical Supplies PLC ${stamp}`,
    isSupplier: true, isCustomer: false, supplierCategory: 'MANUFACTURER',
    email: `sales.a${stamp}@atactical.et`, phone: '+251911000111', tin: `TIN${stamp}`,
    paymentTerms: 'NET_30', deliveryTerms: 'EXW', address: 'Bole Sub-city, Addis Ababa', isActive: true,
  });
  const supB = await expectOk('SUP-2', 'create supplier (distributor)', 'POST', '/api/v2/procurement/contacts', {
    name: `Sheger Safety Distributors ${stamp}`,
    isSupplier: true, isCustomer: false, supplierCategory: 'DISTRIBUTOR',
    email: `info.b${stamp}@sheger.et`, phone: '+251911000222', tin: `TINB${stamp}`,
    paymentTerms: 'NET_15', deliveryTerms: 'CIF', address: 'Kirkos, Addis Ababa', isActive: true,
  });
  const supplierA = supA.data && supA.data._id;
  const supplierB = supB.data && supB.data._id;
  await expectFail('SUP-3', 'duplicate supplier code rejected', 409, 'POST', '/api/v2/procurement/contacts',
    { name: 'Dup', code: supA.data && supA.data.code });

  // ---------- products ----------
  const prodA = await expectOk('PRD-1', 'create product (stockable)', 'POST', '/api/v2/procurement/products', {
    name: `Ballistic Vest Level III ${stamp}`, type: 'STOCKABLE', category: 'Uniforms',
    uom: 'PCS', purchasePrice: 4500, salesPrice: 6200, currentStock: 4, reorderLevel: 10,
    defaultSupplierId: supplierA, isActive: true,
  });
  const prodB = await expectOk('PRD-2', 'create product (consumable)', 'POST', '/api/v2/procurement/products', {
    name: `Duty Belt Heavy Duty ${stamp}`, type: 'CONSUMABLE', category: 'Accessories',
    uom: 'PCS', purchasePrice: 900, salesPrice: 1350, currentStock: 20, reorderLevel: 5,
    defaultSupplierId: supplierB, isActive: true,
  });
  const productA = prodA.data && prodA.data._id;
  const productB = prodB.data && prodB.data._id;
  const prodUpd = await expectOk('PRD-3', 'update product price', 'PUT', `/api/v2/procurement/products/${productA}`,
    { purchasePrice: 4700 });
  record('PRD-4', 'product price persisted', '4700', String(prodUpd.data && prodUpd.data.purchasePrice),
    Number(prodUpd.data && prodUpd.data.purchasePrice) === 4700);

  // ---------- RFQ 1: full happy path to approved PO ----------
  const rfq1 = await expectOk('RFQ-1', 'create RFQ for supplier A', 'POST', '/api/v2/procurement/rfqs', {
    supplierId: supplierA, department: 'Security Operations', warehouse: 'Central Addis Warehouse',
    currency: 'ETB', paymentTerms: 'NET_30', deliveryTerms: 'EXW',
    expectedDeliveryDate: new Date(Date.now() + 14 * 864e5).toISOString(),
    notes: 'Urgent replacement vests',
    lines: [
      { productId: productA, description: 'Ballistic Vest Level III', quantity: 20, uom: 'PCS', estimatedPrice: 4500, tax: 15 },
      { productId: productB, description: 'Duty Belt Heavy Duty', quantity: 30, uom: 'PCS', estimatedPrice: 900, tax: 15 },
    ],
  });
  const rfq1Id = rfq1.data && rfq1.data._id;
  record('RFQ-2', 'RFQ starts DRAFT', 'DRAFT', String(rfq1.data && rfq1.data.status), rfq1.data && rfq1.data.status === 'DRAFT');

  await expectFail('RFQ-3', 'cannot convert unapproved RFQ', 400, 'POST', `/api/v2/procurement/rfqs/${rfq1Id}/convert-to-po`, {});
  await expectOk('RFQ-4', 'submit RFQ', 'POST', `/api/v2/procurement/rfqs/${rfq1Id}/submit`);
  await expectOk('RFQ-5', 'send RFQ to vendor', 'POST', `/api/v2/procurement/rfqs/${rfq1Id}/send`);

  const rfq1Detail = await api('GET', `/api/v2/procurement/rfqs/${rfq1Id}`);
  const rfqLines = (rfq1Detail.data && rfq1Detail.data.lines) || [];
  const quote = await expectOk('RFQ-6', 'record vendor quotation', 'POST', `/api/v2/procurement/rfqs/${rfq1Id}/quote`, {
    quotes: rfqLines.map((l, i) => ({ lineId: l._id, vendorPrice: i === 0 ? 4400 : 880, discount: i === 0 ? 5 : 0, tax: 15 })),
  });
  record('RFQ-7', 'quoted total computed', '>0', String(quote.data && quote.data.totalQuotedAmount),
    Number(quote.data && quote.data.totalQuotedAmount) > 0);
  record('RFQ-8', 'status QUOTATION_RECEIVED', 'QUOTATION_RECEIVED', String(quote.data && quote.data.status),
    quote.data && quote.data.status === 'QUOTATION_RECEIVED');

  const rfqAppr = await expectOk('RFQ-9', 'approve RFQ', 'POST', `/api/v2/procurement/rfqs/${rfq1Id}/approve`);
  record('RFQ-10', 'status APPROVED', 'APPROVED', String(rfqAppr.data && rfqAppr.data.status), rfqAppr.data && rfqAppr.data.status === 'APPROVED');

  const conv = await expectOk('RFQ-11', 'convert approved RFQ to PO', 'POST', `/api/v2/procurement/rfqs/${rfq1Id}/convert-to-po`,
    { warehouse: 'Central Addis Warehouse' });
  const po1Id = conv.data && conv.data._id;
  record('RFQ-12', 'converted PO is DRAFT', 'DRAFT', String(conv.data && conv.data.status), conv.data && conv.data.status === 'DRAFT');

  // ---------- PO 1: submit -> approve (walk threshold stages) ----------
  await expectFail('PO-1', 'cannot receive goods for DRAFT PO', 400, 'POST', '/api/v2/procurement/receipts',
    { purchaseOrderId: po1Id, lines: [{ receivedQuantity: 1 }] });

  const po1Submit = await expectOk('PO-2', 'submit PO for approval', 'POST', `/api/v2/procurement/orders/${po1Id}/submit`);
  record('PO-3', 'PO status SUBMITTED', 'SUBMITTED', String(po1Submit.data && po1Submit.data.status), po1Submit.data && po1Submit.data.status === 'SUBMITTED');

  let poApprove = null;
  for (let i = 0; i < 4; i++) {
    poApprove = await api('POST', `/api/v2/procurement/orders/${po1Id}/approve`, { comments: `Approved at stage ${i + 1}` });
    record(`PO-4.${i + 1}`, `approval step ${i + 1}`, '2xx', `HTTP ${poApprove.status} ${poApprove.data ? poApprove.data.status : ''}`.trim(), ok2xx(poApprove.status));
    if (poApprove.data && poApprove.data.status === 'APPROVED') break;
  }
  const po1 = await api('GET', `/api/v2/procurement/orders/${po1Id}`);
  record('PO-5', 'PO fully approved', 'APPROVED', String(po1.data && po1.data.status), po1.data && po1.data.status === 'APPROVED');
  record('PO-6', 'approval history recorded', '>0', String((po1.data && po1.data.approvalHistory || []).length),
    (po1.data && po1.data.approvalHistory || []).length > 0, JSON.stringify((po1.data && po1.data.approvalHistory || []).slice(-1)));

  // ---------- PO 2: reject path ----------
  const po2 = await expectOk('PO-7', 'create standalone PO', 'POST', '/api/v2/procurement/orders', {
    supplierId: supplierB, department: 'Logistics', warehouse: 'Central Addis Warehouse', currency: 'ETB',
    paymentTerms: 'NET_15', deliveryTerms: 'CIF',
    lines: [{ productId: productB, description: 'Duty Belt Heavy Duty', quantity: 50, uom: 'PCS', unitPrice: 950, discount: 0, tax: 15 }],
  });
  const po2Id = po2.data && po2.data._id;
  await expectOk('PO-8', 'submit PO 2', 'POST', `/api/v2/procurement/orders/${po2Id}/submit`);
  const rej = await expectOk('PO-9', 'reject PO 2 with comment', 'POST', `/api/v2/procurement/orders/${po2Id}/reject`,
    { comments: 'Budget frozen for Q4 logistics' });
  record('PO-10', 'PO 2 status REJECTED', 'REJECTED', String(rej.data && rej.data.status), rej.data && rej.data.status === 'REJECTED');
  const po2Get = await api('GET', `/api/v2/procurement/orders/${po2Id}`);
  const rejStep = ((po2Get.data && po2Get.data.approvalHistory) || []).find((h) => h.action === 'REJECTED');
  record('PO-11', 'rejection reason stored', 'Budget frozen for Q4 logistics', JSON.stringify(rejStep && rejStep.comments),
    !!(rejStep && /Budget frozen/.test(rejStep.comments || '')));

  // ---------- RFQ 2: reject path ----------
  const rfq2 = await expectOk('RFQ-13', 'create RFQ 2 (supplier B)', 'POST', '/api/v2/procurement/rfqs', {
    supplierId: supplierB, department: 'Logistics', warehouse: 'Central Addis Warehouse', currency: 'ETB',
    paymentTerms: 'NET_15', deliveryTerms: 'CIF',
    lines: [{ productId: productB, description: 'Duty Belt Heavy Duty', quantity: 25, uom: 'PCS', estimatedPrice: 900, tax: 15 }],
  });
  const rfq2Id = rfq2.data && rfq2.data._id;
  await expectOk('RFQ-14', 'submit RFQ 2', 'POST', `/api/v2/procurement/rfqs/${rfq2Id}/submit`);
  const rfq2Rej = await expectOk('RFQ-15', 'reject RFQ 2', 'POST', `/api/v2/procurement/rfqs/${rfq2Id}/reject`,
    { reason: 'Vendor pricing above market rate' });
  record('RFQ-16', 'RFQ 2 status REJECTED', 'REJECTED', String(rfq2Rej.data && rfq2Rej.data.status), rfq2Rej.data && rfq2Rej.data.status === 'REJECTED');

  // ---------- RFQ 3: second quote for comparison page ----------
  const rfq3 = await expectOk('RFQ-17', 'create RFQ 3 (supplier A, same items)', 'POST', '/api/v2/procurement/rfqs', {
    supplierId: supplierA, department: 'Security Operations', warehouse: 'Central Addis Warehouse', currency: 'ETB',
    paymentTerms: 'NET_30', deliveryTerms: 'EXW',
    lines: [{ productId: productA, description: 'Ballistic Vest Level III', quantity: 20, uom: 'PCS', estimatedPrice: 4500, tax: 15 }],
  });
  const rfq3Id = rfq3.data && rfq3.data._id;
  await expectOk('RFQ-18', 'submit RFQ 3', 'POST', `/api/v2/procurement/rfqs/${rfq3Id}/submit`);
  await expectOk('RFQ-19', 'send RFQ 3', 'POST', `/api/v2/procurement/rfqs/${rfq3Id}/send`);
  const rfq3Detail = await api('GET', `/api/v2/procurement/rfqs/${rfq3Id}`);
  await expectOk('RFQ-20', 'record quote on RFQ 3', 'POST', `/api/v2/procurement/rfqs/${rfq3Id}/quote`, {
    quotes: ((rfq3Detail.data && rfq3Detail.data.lines) || []).map((l) => ({ lineId: l._id, vendorPrice: 4650, discount: 0, tax: 15 })),
  });

  // ---------- GRN: partial then full receipt ----------
  const po1Detail = await api('GET', `/api/v2/procurement/orders/${po1Id}`);
  const poLines = (po1Detail.data && po1Detail.data.lines) || [];
  const grn1 = await expectOk('GRN-1', 'partial goods receipt (1st line)', 'POST', '/api/v2/procurement/receipts', {
    purchaseOrderId: po1Id, warehouse: 'Central Addis Warehouse', deliveryNoteNumber: `DN-${stamp}-1`,
    remarks: 'First delivery, 12 of 20 vests',
    lines: poLines.map((l, i) => ({ productId: l.productId, quantity: l.quantity, receivedQuantity: i === 0 ? 12 : 0 })),
  });
  record('GRN-2', 'receipt confirmed', 'CONFIRMED', String(grn1.data && grn1.data.status), grn1.data && grn1.data.status === 'CONFIRMED');
  const poAfterGrn = await api('GET', `/api/v2/procurement/orders/${po1Id}`);
  record('GRN-3', 'PO partly received', 'PARTIALLY_RECEIVED', String(poAfterGrn.data && poAfterGrn.data.status),
    poAfterGrn.data && poAfterGrn.data.status === 'PARTIALLY_RECEIVED');

  const grn2 = await expectOk('GRN-4', 'receive remainder', 'POST', '/api/v2/procurement/receipts', {
    purchaseOrderId: po1Id, warehouse: 'Central Addis Warehouse', deliveryNoteNumber: `DN-${stamp}-2`,
    lines: ((poAfterGrn.data && poAfterGrn.data.lines) || []).map((l) => ({
      productId: l.productId, quantity: l.quantity, receivedQuantity: l.quantity - (l.receivedQuantity || 0),
    })).filter((l) => l.receivedQuantity > 0),
  });
  const poDone = await api('GET', `/api/v2/procurement/orders/${po1Id}`);
  record('GRN-5', 'PO fully received', 'FULLY_RECEIVED', String(poDone.data && poDone.data.status), poDone.data && poDone.data.status === 'FULLY_RECEIVED');

  // ---------- Bills: create, post, partial + full payment ----------
  const bill1 = await expectOk('BILL-1', 'create bill from PO', 'POST', '/api/v2/procurement/bills', {
    purchaseOrderId: po1Id, vendorInvoiceNumber: `INV-${stamp}-A`,
    billDate: new Date().toISOString(), dueDate: new Date(Date.now() + 30 * 864e5).toISOString(),
    notes: 'Vendor invoice for delivered vests',
  });
  const bill1Id = bill1.data && bill1.data._id;
  record('BILL-2', 'bill starts DRAFT', 'DRAFT', String(bill1.data && bill1.data.status), bill1.data && bill1.data.status === 'DRAFT');
  record('BILL-3', 'bill total from PO', '>0', String(bill1.data && bill1.data.totalAmount), Number(bill1.data && bill1.data.totalAmount) > 0);

  const posted = await expectOk('BILL-4', 'post bill (journal entry)', 'POST', `/api/v2/procurement/bills/${bill1Id}/post`);
  record('BILL-5', 'bill status POSTED', 'POSTED', String(posted.data && posted.data.status), posted.data && posted.data.status === 'POSTED');
  record('BILL-6', 'journal entry linked', 'set', String(!!(posted.data && posted.data.journalEntryId)), !!(posted.data && posted.data.journalEntryId));

  const total = Number(posted.data && posted.data.totalAmount);
  const part = Math.round(total * 0.4 * 100) / 100;
  const pay1 = await expectOk('BILL-7', 'record partial payment (40%)', 'POST', `/api/v2/procurement/bills/${bill1Id}/payments`,
    { amount: part, paymentMethod: 'BANK_TRANSFER', reference: `FT-${stamp}-1` });
  record('BILL-8', 'status PARTIALLY_PAID', 'PARTIALLY_PAID', String(pay1.data && pay1.data.status), pay1.data && pay1.data.status === 'PARTIALLY_PAID');
  await expectFail('BILL-9', 'over-payment rejected', 400, 'POST', `/api/v2/procurement/bills/${bill1Id}/payments`,
    { amount: total });
  const pay2 = await expectOk('BILL-10', 'record final payment', 'POST', `/api/v2/procurement/bills/${bill1Id}/payments`,
    { amount: Math.round((total - part) * 100) / 100, paymentMethod: 'CHEQUE', reference: `CHQ-${stamp}-2` });
  record('BILL-11', 'bill fully PAID', 'PAID', String(pay2.data && pay2.data.status), pay2.data && pay2.data.status === 'PAID');

  const bill2 = await expectOk('BILL-12', 'second bill for PO 2 supplier', 'POST', '/api/v2/procurement/bills', {
    purchaseOrderId: po2Id, vendorInvoiceNumber: `INV-${stamp}-B`,
    dueDate: new Date(Date.now() - 5 * 864e5).toISOString(), notes: 'Overdue test bill',
  });
  record('BILL-13', 'overdue bill created', '2xx', `HTTP ${bill2.status}`, ok2xx(bill2.status));

  // ---------- Reports ----------
  for (const [id, rp] of Object.entries({
    'REP-1': '/api/v2/procurement/reports/po-summary',
    'REP-2': '/api/v2/procurement/reports/supplier-spend',
    'REP-3': '/api/v2/procurement/reports/price-history',
    'REP-4': '/api/v2/procurement/reports/outstanding',
  })) {
    const r = await expectOk(id, `report ${rp.split('/').pop()}`, 'GET', rp);
    record(`${id}-rows`, `report ${rp.split('/').pop()} rows`, '>0', String(Array.isArray(r.data) ? r.data.length : '-'),
      Array.isArray(r.data) && r.data.length > 0);
  }

  // ---------- Settings ----------
  const settings = await expectOk('SET-1', 'read procurement settings', 'GET', '/api/v2/procurement/settings');
  const tiers = [
    { tierNumber: 1, name: 'Department Approval', minAmount: 0, maxAmount: 50000, requiredRoles: ['HEAD', 'SUPER_ADMIN'] },
    { tierNumber: 2, name: 'Finance Approval', minAmount: 50000, maxAmount: null, requiredRoles: ['FINANCE_OFFICER', 'CEO'] },
  ];
  const updated = await expectOk('SET-2', 'update approval tiers', 'PUT', '/api/v2/procurement/settings', { approvalTiers: tiers });
  record('SET-3', 'tiers persisted', '2', String((updated.data && updated.data.approvalTiers || []).length),
    (updated.data && updated.data.approvalTiers || []).length === 2, JSON.stringify(updated.data && updated.data.approvalTiers));
  const reread = await api('GET', '/api/v2/procurement/settings');
  record('SET-4', 'tiers read back', '2', String((reread.data && reread.data.approvalTiers || []).length),
    (reread.data && reread.data.approvalTiers || []).length === 2);
  await expectOk('SET-5', 'restore original tiers', 'PUT', '/api/v2/procurement/settings',
    { approvalTiers: settings.data && settings.data.approvalTiers });

  // ---------- evidence ----------
  const outDir = path.resolve(__dirname, '..', '.qa-artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    ids: { supplierA, supplierB, productA, productB, rfq1Id, rfq2Id, rfq3Id, po1Id, po2Id, bill1Id },
    results,
  };
  fs.writeFileSync(path.join(outDir, 'procurement-e2e.json'), JSON.stringify(summary, null, 2));

  for (const r of results) {
    console.log(`${r.status.padEnd(4)} ${r.id.padEnd(9)} ${r.scenario} | expected ${r.expected} | got ${r.actual}${r.detail ? ' | ' + r.detail : ''}`);
  }
  console.log(`\nTOTAL ${results.length} / PASS ${summary.passed} / FAIL ${summary.failed}`);
})();
