const fs = require('node:fs');
const assert = require('node:assert/strict');
const fixture = JSON.parse(fs.readFileSync('../.guard-e2e/evidence.json', 'utf8'));
const r2 = n => Math.round(n * 100) / 100;
const r4 = n => Math.round(n * 10000) / 10000;
(async () => {
 const login = await fetch('http://127.0.0.1:5019/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@vitalpayroll.com',password:'password123'})});
 assert.equal(login.status,200);const token=(await login.json()).data.token;
 const response=await fetch(`http://127.0.0.1:5019/api/guard-payroll/runs/${fixture.runId}`,{headers:{Authorization:`Bearer ${token}`}});assert.equal(response.status,200);const actualRun=(await response.json()).data;
 const rows=[];let assertions=0;
 for(const guard of fixture.guards) {
  const actual=actualRun.records.find(r=>r.employeeId===guard.id);assert.ok(actual);
  const primarySite=fixture.sites.find(s=>s.code===guard.primarySite);
  const additionalSite=fixture.sites.find(s=>s.code===guard.additionalSite);
  const hours=fixture.attendance.find(a=>a.guardId===guard.id&&a.siteId===primarySite.id);
  const extra=fixture.attendance.find(a=>a.guardId===guard.id&&a.siteId===additionalSite.id);
  const compensation=primarySite.amount,otRate=r4(compensation/240),structural=r2(otRate*32),remaining=r2(compensation-structural),transport=r2(remaining*0.2),basic=r2(remaining-transport),basicHourly=r4(basic/208);
  const normal=r2(hours.normalHours*basicHourly),sunday=r2(hours.sundayHours*otRate),holiday=r2(hours.holidayHours*otRate);
  const additionalOT=r4(additionalSite.amount/240),additionalHours=extra.normalHours+extra.sundayHours+extra.holidayHours,additionalPay=r2(additionalHours*additionalOT);
  const taxable=r2(normal+sunday+holiday+additionalPay),gross=r2(taxable+transport),pensionBase=r2(normal+sunday),pension=r2(pensionBase*0.07),employer=r2(pensionBase*0.11);
  // Independent closed-form schedule: fixture bands 0/2000/4000/7000/10000/14000.
  const tax=r2(taxable<=2000?0:taxable<=4000?taxable*.15-300:taxable<=7000?taxable*.20-500:taxable<=10000?taxable*.25-850:taxable<=14000?taxable*.30-1350:taxable*.35-2050);
  const expected={compensation,otRate,structural,remaining,transport,basic,basicHourly,normal,sunday,holiday,primaryPay:r2(normal+sunday+holiday+transport),additionalCompensation:additionalSite.amount,additionalOT,additionalHours,additionalPay,gross,pensionBase,pension,employer,taxable,tax,other:0,net:r2(gross-pension-tax)};
  const p=actual.primarySite,a=actual.additionalSites[0];
  const observed={compensation:p.compensationAmount,otRate:p.otRate,structural:p.sundayStructuralAllocation,remaining:p.remaining,transport:p.transportPaid,basic:p.basicSalary,basicHourly:p.basicHourlyRate,normal:p.normalPay,sunday:p.sundayPay,holiday:p.holidayPay,primaryPay:p.siteEarnings,additionalCompensation:a.compensationAmount,additionalOT:a.otRate,additionalHours:a.totalHours,additionalPay:a.siteEarnings,gross:actual.grossEarnings,pensionBase:actual.pensionBase,pension:actual.employeePension,employer:actual.employerPension,taxable:actual.taxableEarnings,tax:actual.incomeTax,other:actual.totalDeductions,net:actual.netPay};
  for(const key of Object.keys(expected)){assert.equal(observed[key],expected[key],`${guard.code}: ${key}`);assertions++;}
  assert.deepEqual([p.normalHours,p.sundayHours,p.holidayHours],[hours.normalHours,hours.sundayHours,hours.holidayHours]);assertions++;
  assert.deepEqual([a.normalHours,a.sundayHours,a.holidayHours],[extra.normalHours,extra.sundayHours,extra.holidayHours]);assertions++;
  rows.push({guardCode:guard.code,employeeId:guard.id,recordId:actual._id,expected,actual:observed,match:true});
  console.log(`PASS ${guard.code}: gross ${gross}, pension ${pension}, tax ${tax}, net ${expected.net}`);
 }
 for(const [runKey,rowKey]of [['grossEarnings','gross'],['employeePension','pension'],['employerPension','employer'],['incomeTax','tax'],['netPay','net']]){assert.equal(actualRun.run.totals[runKey],r2(rows.reduce((n,r)=>n+r.expected[rowKey],0)));assertions++;}
 const result={generatedAt:new Date().toISOString(),database:fixture.database,period:fixture.period,runId:fixture.runId,status:actualRun.run.status,method:'Known UI fixture inputs, independent formulas and closed-form band tax; no stored rates reused',assertions,rows,totals:actualRun.run.totals};
 fs.writeFileSync('../Documentation/Guard-Payroll-E2E-Reconciliation-2026-10-12.json',JSON.stringify(result,null,2));
 console.log(`PASS ${assertions} independent reconciliation assertions`);
})().catch(e=>{console.error(e);process.exitCode=1;});
