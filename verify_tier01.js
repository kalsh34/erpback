const http = require('http');
function api(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 5000, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const data = body ? JSON.stringify(body) : null;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(b) }); } catch (e) { resolve({ status: res.statusCode, raw: b }); } }); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
function login(email) { return api('POST', '/api/auth/login', null, { email, password: 'password123' }).then(r => r.data?.data?.token || ''); }
const pick = (o, ks) => { const r = {}; ks.forEach(k => r[k] = o?.[k]); return r; };

async function main() {
  const fin = await login('finance@vitalpayroll.com');
  const head = await login('head@vitalpayroll.com');
  const hr = await login('hr@vitalpayroll.com');
  const ceo = await login('ceo@vitalpayroll.com');
  const admin = await login('admin@vitalpayroll.com');
  console.log('logins:', { fin: !!fin, head: !!head, hr: !!hr, ceo: !!ceo, admin: !!admin });
  let pass = 0, fail = 0;
  const check = (name, cond, detail) => {
    if (cond) { pass++; console.log('  PASS ' + name); }
    else { fail++; console.log('  FAIL ' + name + ' :: ' + detail); }
  };

  // ---------- T1.5: CEO blocked on all 8 staff write endpoints ----------
  console.log('== T1.5 CEO staff endpoints (all must be 403) ==');
  const sp = await api('GET', '/api/office-payroll?limit=50', hr);
  const staffRec = (sp.data?.data || [])[0];
  if (!staffRec) { console.log('  SKIP: no staff records'); }
  else {
    const sid = staffRec._id;
    const eps = [
      ['generate', 'POST', '/api/office-payroll/generate/000000000000000000000000', undefined],
      ['salary', 'PUT', '/api/office-payroll/' + sid + '/salary', { bonus: 1 }],
      ['enter-ot', 'POST', '/api/office-payroll/' + sid + '/enter-ot', { regularOtHours: 1 }],
      ['calculate', 'POST', '/api/office-payroll/' + sid + '/calculate', undefined],
      ['submit', 'POST', '/api/office-payroll/' + sid + '/submit', undefined],
      ['check', 'POST', '/api/office-payroll/' + sid + '/check', undefined],
      ['approve', 'POST', '/api/office-payroll/' + sid + '/approve', undefined],
      ['return', 'POST', '/api/office-payroll/' + sid + '/return', { reason: 'x' }],
      ['initiate-payment', 'POST', '/api/office-payroll/' + sid + '/initiate-payment', undefined],
      ['confirm-paid', 'POST', '/api/office-payroll/' + sid + '/confirm-paid', { paymentMethod: 'CASH', paymentDate: new Date().toISOString() }],
    ];
    for (const [name, m, p, b] of eps) {
      const r = await api(m, p, ceo, b);
      check('CEO staff ' + name + ' blocked', r.status === 403, 'status=' + r.status + ' body=' + JSON.stringify(r.data).slice(0, 120));
    }
    // CEO can still read
    const rr = await api('GET', '/api/office-payroll?limit=5', ceo);
    check('CEO staff read allowed', rr.status === 200, 'status=' + rr.status);
  }

  // ---------- T0.3: staff gates ----------
  console.log('== T0.3 staff gates ==');
  {
    const sp2 = await api('GET', '/api/office-payroll?limit=50', hr);
    const draft = (sp2.data?.data || []).find(r => r.status === 'DRAFT');
    if (!draft) console.log('  SKIP: no DRAFT staff record for gate test');
    else {
      const r = await api('POST', '/api/office-payroll/' + draft._id + '/submit', fin);
      check('staff submit from DRAFT rejected', r.status === 400, 'status=' + r.status + ' ' + JSON.stringify(r.data).slice(0, 120));
    }
    const nonDraft = (sp2.data?.data || []).find(r => r.status !== 'DRAFT' && r.status !== 'RETURNED');
    if (!nonDraft) console.log('  SKIP: no non-DRAFT staff record for calc gate test');
    else {
      const r = await api('POST', '/api/office-payroll/' + nonDraft._id + '/calculate', fin);
      check('staff calculate off DRAFT/RETURNED rejected', r.status === 400, 'status=' + r.status + ' recStatus=' + nonDraft.status);
    }
  }

  // ---------- T1.6: bonus acceptance ----------
  console.log('== T1.6 bonus acceptance ==');
  {
    const sp3 = await api('GET', '/api/office-payroll?limit=50', hr);
    const draft = (sp3.data?.data || []).find(r => r.status === 'DRAFT');
    if (!draft) console.log('  SKIP: no DRAFT staff record for bonus test');
    else {
      const sid = draft._id;
      // run A: bonus 5000
      await api('PUT', '/api/office-payroll/' + sid + '/salary', fin, { bonus: 5000 });
      await api('POST', '/api/office-payroll/' + sid + '/calculate', fin);
      let a = (await api('GET', '/api/office-payroll/' + sid, hr)).data?.data;
      const A = pick(a, ['grossSalary', 'taxableSalary', 'incomeTax', 'employeePension', 'employerPension', 'netPay']);
      console.log('  with bonus=5000:', JSON.stringify(A));
      // walk back: submit -> check -> return (FINANCE returns CHECKED) -> bonus 0 -> recalc
      await api('POST', '/api/office-payroll/' + sid + '/submit', fin);
      await api('POST', '/api/office-payroll/' + sid + '/check', fin);
      const ret = await api('POST', '/api/office-payroll/' + sid + '/return', fin, { reason: 'bonus acceptance test' });
      console.log('  return from CHECKED by FIN:', ret.status, ret.data?.success);
      await api('PUT', '/api/office-payroll/' + sid + '/salary', fin, { bonus: 0 });
      await api('POST', '/api/office-payroll/' + sid + '/calculate', fin);
      let b = (await api('GET', '/api/office-payroll/' + sid, hr)).data?.data;
      const B = pick(b, ['grossSalary', 'taxableSalary', 'incomeTax', 'employeePension', 'employerPension', 'netPay']);
      console.log('  with bonus=0:   ', JSON.stringify(B));
      check('gross identical', A.grossSalary === B.grossSalary, A.grossSalary + ' vs ' + B.grossSalary);
      check('taxable identical', A.taxableSalary === B.taxableSalary, A.taxableSalary + ' vs ' + B.taxableSalary);
      check('tax identical', A.incomeTax === B.incomeTax, A.incomeTax + ' vs ' + B.incomeTax);
      check('empPen identical', A.employeePension === B.employeePension, A.employeePension + ' vs ' + B.employeePension);
      check('emprPen identical', A.employerPension === B.employerPension, A.employerPension + ' vs ' + B.employerPension);
      check('net differs by exactly bonus', Math.abs((A.netPay - B.netPay) - 5000) < 0.02, A.netPay + ' vs ' + B.netPay);
    }
  }

  // ---------- T1.7: return roles ----------
  console.log('== T1.7 return roles (guard) ==');
  {
    const gp = await api('GET', '/api/guard-payroll?limit=50', hr);
    const list = gp.data?.data || [];
    // FINANCE returns CHECKED: ok
    let checked = list.find(r => r.status === 'CHECKED');
    if (!checked) {
      // build one: DRAFT -> calc -> submit -> check
      const d = list.find(r => r.status === 'DRAFT' || r.status === 'RETURNED' || r.status === 'CALCULATED');
      if (d) {
        if (d.status === 'DRAFT' || d.status === 'RETURNED') await api('POST', '/api/guard-payroll/' + d._id + '/calculate', fin);
        const cur = (await api('GET', '/api/guard-payroll/' + d._id, hr)).data?.data;
        if (cur.status === 'CALCULATED' || cur.status === 'RETURNED') {
          if (cur.status === 'RETURNED') await api('POST', '/api/guard-payroll/' + d._id + '/calculate', fin);
          await api('POST', '/api/guard-payroll/' + d._id + '/submit', fin);
        }
        await api('POST', '/api/guard-payroll/' + d._id + '/check', fin);
        checked = (await api('GET', '/api/guard-payroll/' + d._id, hr)).data?.data;
      }
    }
    if (checked && checked.status === 'CHECKED') {
      const r = await api('POST', '/api/guard-payroll/' + checked._id + '/return', fin, { reason: 't17 fin-checked' });
      check('FINANCE returns CHECKED guard', r.status === 200 && r.data?.success, 'status=' + r.status);
    } else console.log('  SKIP: could not stage CHECKED guard');

    // APPROVED + FINANCE return -> 403; APPROVED + HEAD return -> 200
    const gp2 = await api('GET', '/api/guard-payroll?limit=50', hr);
    let appr = (gp2.data?.data || []).find(r => r.status === 'APPROVED');
    if (!appr) {
      const d = (gp2.data?.data || []).find(r => ['DRAFT', 'RETURNED', 'CALCULATED', 'SUBMITTED', 'CHECKED'].includes(r.status));
      if (d) {
        const id = d._id;
        let cur = (await api('GET', '/api/guard-payroll/' + id, hr)).data?.data;
        if (cur.status === 'DRAFT' || cur.status === 'RETURNED') { await api('POST', '/api/guard-payroll/' + id + '/calculate', fin); cur = (await api('GET', '/api/guard-payroll/' + id, hr)).data?.data; }
        if (cur.status === 'CALCULATED') { await api('POST', '/api/guard-payroll/' + id + '/submit', fin); cur = (await api('GET', '/api/guard-payroll/' + id, hr)).data?.data; }
        if (cur.status === 'SUBMITTED') { await api('POST', '/api/guard-payroll/' + id + '/check', fin); cur = (await api('GET', '/api/guard-payroll/' + id, hr)).data?.data; }
        if (cur.status === 'CHECKED') { await api('POST', '/api/guard-payroll/' + id + '/approve', head); appr = (await api('GET', '/api/guard-payroll/' + id, hr)).data?.data; }
      }
    }
    if (appr && appr.status === 'APPROVED') {
      const r1 = await api('POST', '/api/guard-payroll/' + appr._id + '/return', fin, { reason: 't17 fin-approved' });
      check('FINANCE blocked returning APPROVED guard', r1.status === 403, 'status=' + r1.status);
      const r2 = await api('POST', '/api/guard-payroll/' + appr._id + '/return', head, { reason: 't17 head-approved' });
      check('HEAD returns APPROVED guard', r2.status === 200 && r2.data?.success, 'status=' + r2.status + ' ' + JSON.stringify(r2.data).slice(0, 120));
    } else console.log('  SKIP: could not stage APPROVED guard');
  }

  console.log('== T1.7 return roles (staff) ==');
  {
    const sp4 = await api('GET', '/api/office-payroll?limit=50', hr);
    const list = sp4.data?.data || [];
    const stageTo = async (id, target) => {
      const order = ['DRAFT', 'CALCULATED', 'SUBMITTED', 'CHECKED', 'APPROVED'];
      let cur = (await api('GET', '/api/office-payroll/' + id, hr)).data?.data;
      const acts = { DRAFT: ['calculate', 'fin'], CALCULATED: ['submit', 'fin'], SUBMITTED: ['check', 'fin'], CHECKED: ['approve', 'head'] };
      let guard = 0;
      while (cur.status !== target && guard++ < 6) {
        if (cur.status === 'RETURNED') { await api('POST', '/api/office-payroll/' + id + '/calculate', fin); }
        else {
          const [act, who] = acts[cur.status] || [];
          if (!act) break;
          await api('POST', '/api/office-payroll/' + id + '/' + act, who === 'fin' ? fin : head);
        }
        cur = (await api('GET', '/api/office-payroll/' + id, hr)).data?.data;
      }
      return cur;
    };
    let c = list.find(r => r.status === 'CHECKED');
    if (!c) {
      const d = list.find(r => ['DRAFT', 'RETURNED', 'CALCULATED', 'SUBMITTED'].includes(r.status));
      if (d) c = await stageTo(d._id, 'CHECKED');
    }
    if (c && c.status === 'CHECKED') {
      const r = await api('POST', '/api/office-payroll/' + c._id + '/return', fin, { reason: 't17 staff fin-checked' });
      check('FINANCE returns CHECKED staff', r.status === 200 && r.data?.success, 'status=' + r.status);
    } else console.log('  SKIP: could not stage CHECKED staff');

    const sp5 = await api('GET', '/api/office-payroll?limit=50', hr);
    let a = (sp5.data?.data || []).find(r => r.status === 'APPROVED');
    if (!a) {
      const d = (sp5.data?.data || []).find(r => ['DRAFT', 'RETURNED', 'CALCULATED', 'SUBMITTED', 'CHECKED'].includes(r.status));
      if (d) a = await stageTo(d._id, 'APPROVED');
    }
    if (a && a.status === 'APPROVED') {
      const r1 = await api('POST', '/api/office-payroll/' + a._id + '/return', fin, { reason: 't17 staff fin-approved' });
      check('FINANCE blocked returning APPROVED staff', r1.status === 403, 'status=' + r1.status);
      const r2 = await api('POST', '/api/office-payroll/' + a._id + '/return', head, { reason: 't17 staff head-approved' });
      check('HEAD returns APPROVED staff', r2.status === 200 && r2.data?.success, 'status=' + r2.status);
    } else console.log('  SKIP: could not stage APPROVED staff');
  }

  // ---------- T0.1 loan timing + full chain regression ----------
  console.log('== T0.1/T0.2 loan + journal + full chain ==');
  {
    const sp6 = await api('GET', '/api/office-payroll?limit=50', hr);
    const cand = (sp6.data?.data || []).find(r => ['DRAFT', 'RETURNED'].includes(r.status));
    if (!cand) console.log('  SKIP: no DRAFT/RETURNED staff for chain test');
    else {
      const id = cand._id;
      const before = (await api('GET', '/api/office-payroll/' + id, hr)).data?.data;
      console.log('  loanDeduction snapshot:', before.loanDeduction);
      await api('POST', '/api/office-payroll/' + id + '/calculate', fin);
      await api('POST', '/api/office-payroll/' + id + '/submit', fin);
      await api('POST', '/api/office-payroll/' + id + '/check', fin);
      await api('POST', '/api/office-payroll/' + id + '/approve', head);
      await api('POST', '/api/office-payroll/' + id + '/initiate-payment', fin);
      const paid = await api('POST', '/api/office-payroll/' + id + '/confirm-paid', fin, { paymentMethod: 'BANK_TRANSFER', bankReference: 'TIER0-TEST', paymentDate: new Date().toISOString() });
      check('staff confirm-paid succeeds', paid.status === 200 && paid.data?.success, 'status=' + paid.status);
      const after = (await api('GET', '/api/office-payroll/' + id, hr)).data?.data;
      check('record PAID', after.status === 'PAID', 'status=' + after.status);
      const j = await api('GET', '/api/journal?limit=5', hr);
      const entries = j.data?.data || j.data || [];
      console.log('  journal entries found:', Array.isArray(entries) ? entries.length : '?');
      check('journal has entries', Array.isArray(entries) && entries.length > 0, JSON.stringify(j.data).slice(0, 120));
    }
  }

  console.log('\nRESULT: pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('ERR:', e.message); process.exit(2); });
