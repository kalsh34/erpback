const fs = require('node:fs');
const assert = require('node:assert/strict');
const fixture = JSON.parse(fs.readFileSync('../.guard-e2e/evidence.json', 'utf8'));
const BASE = 'http://127.0.0.1:5019/api';
let token;
const results=[];
async function request(method, route, body, auth = token) {
 const r=await fetch(BASE+route,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
 const text=await r.text();let json;try{json=JSON.parse(text);}catch{json=text;}
 return {status:r.status,data:json?.data,body:json};
}
async function api(method,route,body){const r=await request(method,route,body);assert.ok(r.status<400,JSON.stringify(r));return r.data;}
function check(name,condition){assert.ok(condition,name);results.push({name,result:'PASS'});console.log('PASS',name);}
async function denied(name,method,route,status,body,auth){const r=await request(method,route,body,auth);assert.equal(r.status,status,JSON.stringify(r));check(name,true);return r;}
(async()=>{
 token=(await api('POST','/auth/login',{email:'admin@vitalpayroll.com',password:'password123'})).token;
 const paid=await api('GET',`/guard-payroll/runs/${fixture.runId}`);
 check('Final October run PAID with exactly 3 records',paid.run.status==='PAID'&&paid.records.length===3);
 const preflight=await api('GET','/guard-payroll/readiness?periodKey=2026-10');
 check('Monthly-only attendance readiness recognizes six sheets, not missing daily records',preflight.ready&&preflight.rows.length===3&&preflight.rows.every(g=>g.sites.length===2&&g.sites.every(s=>s.source==='MONTHLY')));
 const attReadiness=await api('GET','/attendance/payroll-readiness?year=2026&month=10');check('Attendance and payroll share consistent readiness',attReadiness.ready&&attReadiness.missingAttendance.length===0);
 await denied('Unauthenticated payroll denied','GET','/guard-payroll/runs',401,undefined,null);
 const ops=(await api('POST','/auth/login',{email:'ops@vitalpayroll.com',password:'password123'})).token;
 await denied('Operations cannot calculate payroll','POST','/guard-payroll/runs',403,{periodKey:'2026-11'},ops);
 const finance=(await api('POST','/auth/login',{email:'finance@vitalpayroll.com',password:'password123'})).token;
 await denied('Finance cannot approve payroll','POST',`/guard-payroll/runs/${fixture.runId}/approve`,403,{},finance);
 const guard=(await api('POST','/auth/login',{email:'guard@vitalpayroll.com',password:'password123'})).token;
 await denied('Guard cannot read another guard payroll','GET',`/guard-payroll/records/${paid.records[0]._id}`,403,undefined,guard);
 await denied('Invalid monthly period rejected','POST','/attendance/monthly-sheet',400,{year:2026,month:13,entries:[fixture.attendance[0]]});
 await denied('Paid attendance locked','POST','/attendance/monthly-sheet',409,{year:2026,month:10,entries:[fixture.attendance[0]]});
 await denied('Paid recalculation denied','POST',`/guard-payroll/runs/${fixture.runId}/recalculate`,409,{});
 await denied('Paid return denied','POST',`/guard-payroll/runs/${fixture.runId}/return`,409,{reason:'TEST correction'});
 const regressionMonth=Number(process.env.GUARD_E2E_MONTH || 11),regressionYear=Number(process.env.GUARD_E2E_YEAR || 2026);
 const period=`${regressionYear}-${String(regressionMonth).padStart(2,'0')}`;
 const november=await api('POST','/guard-payroll/runs',{periodKey:period}),id=november.run._id;
 check('Missing attendance explicit blocker with no silent zero-pay records',november.records.length===0&&november.run.problems.length===3&&november.run.problems.every(p=>p.code==='MISSING_ATTENDANCE'));
 await denied('Missing attendance blocks submission','POST',`/guard-payroll/runs/${id}/submit`,400,{});
 const saved=await api('POST','/attendance/monthly-sheet',{year:regressionYear,month:regressionMonth,entries:fixture.attendance});check('Six November sheets saved via API',saved.saved.length===6&&!saved.failed.length);
 let ready=await api('POST',`/guard-payroll/runs/${id}/recalculate`,{});check('Recalculation after attendance returns 3 guards',ready.records.length===3&&!ready.run.problems.length);
 const expectedNet=ready.run.totals.netPay;
 await api('POST','/attendance/monthly-sheet',{year:regressionYear,month:regressionMonth,entries:[{...fixture.attendance[0],normalHours:184}]});
 const stale=await denied('Changed attendance cannot silently submit stale calculation','POST',`/guard-payroll/runs/${id}/submit`,409,{});check('Stale submission message instructs recalculation',stale.body.message.includes('recalculate'));
 ready=await api('POST',`/guard-payroll/runs/${id}/recalculate`,{});check('Corrected attendance changes calculated net pay',ready.run.totals.netPay!==expectedNet);
 await api('POST','/attendance/monthly-sheet',{year:regressionYear,month:regressionMonth,entries:[fixture.attendance[0]]});ready=await api('POST',`/guard-payroll/runs/${id}/recalculate`,{});check('Restore/recalculate matches original inputs',ready.run.totals.netPay===expectedNet);
 await denied('Unapproved bank instructions denied','GET',`/guard-payroll/runs/${id}/export/bank`,409);
 await api('POST',`/guard-payroll/runs/${id}/submit`,{});
 await denied('Submitted monthly hours locked','POST','/attendance/monthly-sheet',409,{year:regressionYear,month:regressionMonth,entries:[fixture.attendance[0]]});
 await denied('Submitted recalculation denied','POST',`/guard-payroll/runs/${id}/recalculate`,409,{});
 await denied('Blank correction reason denied','POST',`/guard-payroll/runs/${id}/return`,400,{reason:' '});
 await api('POST',`/guard-payroll/runs/${id}/return`,{reason:'TEST regression verifies attendance unlock'});check('Return unlocks period',(await api('GET',`/guard-payroll/attendance-lock?periodKey=${period}`)).locked===false);
 await api('POST',`/guard-payroll/runs/${id}/recalculate`,{});await api('POST',`/guard-payroll/runs/${id}/submit`,{});await api('POST',`/guard-payroll/runs/${id}/check`,{});
 const approvals=await Promise.all([request('POST',`/guard-payroll/runs/${id}/approve`,{}),request('POST',`/guard-payroll/runs/${id}/approve`,{})]);check('Concurrent approval exactly one success',approvals.filter(r=>r.status===200).length===1&&approvals.filter(r=>r.status===409).length===1);
 await denied('Payment requires confirmation reference','POST',`/guard-payroll/runs/${id}/pay`,400,{paymentRef:''});
 const bank1=await request('GET',`/guard-payroll/runs/${id}/export/bank`),bank2=await request('GET',`/guard-payroll/runs/${id}/export/bank`);check('Repeat bank export deterministic, 3 instruction rows only',bank1.status===200&&bank1.body===bank2.body&&bank1.body.trim().split('\n').length===4);
 await api('POST',`/guard-payroll/runs/${id}/pay`,{paymentRef:'TEST-REGRESSION-NO-BANK-EXECUTION'});
 await denied('Repeat paid transition denied','POST',`/guard-payroll/runs/${id}/pay`,409,{paymentRef:'TEST-REPEAT'});
 check('Final records remain three after repeat actions',(await api('GET',`/guard-payroll/runs/${id}`)).records.length===3);
 // Change only FUTURE rates through the authoritative API; paid history must stay unchanged.
 const current=await api('GET','/guard-payroll/compensations');const firstSite=fixture.sites[0];
 if(!current.some(r=>r.siteId._id===firstSite.id&&r.effectiveFrom.startsWith('2026-12-01')))await api('POST','/guard-payroll/compensations',{siteId:firstSite.id,compensationAmount:firstSite.amount+100,effectiveFrom:'2026-12-01',notes:'TEST future rate verifies paid snapshot stability'});
 check('Historical payroll snapshot unchanged by future rate changes',JSON.stringify((await api('GET',`/guard-payroll/runs/${fixture.runId}`)).records)===JSON.stringify(paid.records));
 // All guards assigned to existing sites; create one isolated unrated additional site via API and verify no partial pay.
 const invalidSite=await request('POST','/sites',{siteCode:'E2E-INVALID',siteName:'TEST invalid required fields',location:'TEST ONLY'});check('Missing required site fields return validation 400 rather than 500',invalidSite.status===400);
 let sites=await api('GET','/sites?search=E2E-NORATE');let unrated=sites[0];
 if(!unrated)unrated=await api('POST','/sites',{siteCode:'E2E-NORATE',siteName:'TEST missing-rate regression',location:'TEST ONLY',siteType:'COMMERCIAL',agreedManpower:1,actualManpower:0});
 let assignments=await api('GET',`/guards/${fixture.guards[0].id}/sites`);
 if(!assignments.some(a=>a.siteId._id===unrated._id))await api('POST','/guards/assign-site',{guardId:fixture.guards[0].id,siteId:unrated._id,effectiveFrom:'2027-01-01',role:'GUARD'});
 const additional={guardId:fixture.guards[0].id,siteId:unrated._id,normalHours:8,sundayHours:0,holidayHours:0};
 await api('POST','/attendance/monthly-sheet',{year:2027,month:1,entries:[...fixture.attendance,additional]});
 const missing=await api('POST','/guard-payroll/runs',{periodKey:'2027-01'});check('Missing additional-site rate blocks partial pay',missing.run.problems.some(p=>p.code==='NO_ADDITIONAL_SITE_COMPENSATION')&&!missing.records.some(r=>r.employeeId===fixture.guards[0].id));
 await denied('Missing additional-site rate blocks submission','POST',`/guard-payroll/runs/${missing.run._id}/submit`,400,{});
 const badEntry=await request('POST','/attendance/monthly-sheet',{year:2027,month:1,entries:[{...additional,normalHours:900}]});check('Excessive monthly hours rejected clearly',badEntry.status===207&&badEntry.data.failed[0].message.includes('744'));
 const overlap=await request('PUT',`/guards/site-assignment/${fixture.guards[0].assignments.find(a=>!a.isPrimary).id}/history`,{effectiveFrom:'2027-01-01',effectiveTo:null,isPrimary:true,reason:'TEST overlap rejection'});check('Second concurrent primary assignment rejected',overlap.status===409);
 const sheet=await api('GET','/attendance/monthly-sheet?year=2026&month=10');check('October remains six sheets',sheet.stats.savedSheets===6);
 fs.writeFileSync('../Documentation/Guard-Payroll-E2E-API-2026-10-12.json',JSON.stringify({generatedAt:new Date().toISOString(),isolatedDatabase:fixture.database,results,checks:results.length,bankExecution:false,regressionPeriods:[period,'2027-01'],regressionSite:unrated._id},null,2));
 console.log(`PASS ${results.length} HTTP regression checks`);
})().catch(e=>{console.error(e);fs.writeFileSync('../.guard-e2e/api-failure.json',JSON.stringify({results,failure:e.message},null,2));process.exitCode=1;});
