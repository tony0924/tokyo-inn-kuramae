import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from '../functions/node_modules/firebase-admin/lib/app/index.js';
import { getFirestore, Timestamp } from '../functions/node_modules/firebase-admin/lib/firestore/index.js';
import { processRecurringExpenseAction as act, generateTemplateBills as generate } from '../functions/recurringExpenses.js';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('僅允許 Emulator 測試');
const app=initializeApp({projectId:'demo-recurring-expenses'});const db=getFirestore(app);after(()=>deleteApp(app));
const t={name:'測試管理費',category:'管理費',amount:10000,currency:'JPY',day:5,startMonth:'2025-09',method:'轉帳',note:''};
const date = s => new Date(s+'T00:15:00+08:00');
const bills = id => db.collection('recurringExpenseBills').where('templateId','==',id).get();
const expense = (id,month) => db.collection('expenses').doc(`recurring_${id}_${month}`).get();
test('從 2025-09 一次補齊 13 個月、日圓自動入帳、重試與改價不覆寫歷史', async()=>{
  const now=date('2026-09-12');const {id}=await act(db,'admin',{action:'saveTemplate',template:t},now);
  assert.equal((await bills(id)).size,13);
  const first=(await expense(id,'2025-09')).data();assert.equal(first.amount,10000);assert.equal(first.currency,'JPY');assert.equal(first.amountTwd,null);assert.equal(first.paidAt.toDate().toISOString().slice(0,10),'2025-09-05');
  await Promise.all([generate(db,id,now),generate(db,id,now)]);assert.equal((await bills(id)).size,13);
  await act(db,'admin',{action:'saveTemplate',id,template:{...t,amount:12000}},now);assert.equal((await expense(id,'2025-09')).data().amount,10000);
  await generate(db,id,date('2026-10-04'));assert.equal((await expense(id,'2026-10')).exists,false);
  await generate(db,id,date('2026-10-05'));assert.equal((await expense(id,'2026-10')).data().amount,12000);
  await act(db,'admin',{action:'saveTemplate',id,template:{...t,startMonth:'2025-07',amount:12000}},date('2026-10-06'));
  assert.equal((await bills(id)).size,16);assert.equal((await expense(id,'2025-07')).data().amount,12000);assert.equal((await expense(id,'2025-09')).data().amount,10000);
});
test('超過 24 個月完整補齊、月底到期、暫停恢復與再回溯不補暫停月份',async()=>{
  const {id}=await act(db,'admin',{action:'saveTemplate',template:{...t,startMonth:'2023-01',day:31}},date('2026-02-27'));
  assert.equal((await bills(id)).size,37);assert.equal((await expense(id,'2026-02')).exists,false);
  await generate(db,id,date('2026-02-28'));assert.equal((await expense(id,'2026-02')).data().paidAt.toDate().toISOString().slice(0,10),'2026-02-28');
  await act(db,'admin',{action:'setActive',id,active:false},date('2026-03-01'));await generate(db,id,date('2026-04-30'));assert.equal((await expense(id,'2026-03')).exists,false);
  await act(db,'admin',{action:'setActive',id,active:true},date('2026-05-31'));assert.equal((await expense(id,'2026-05')).exists,true);
  await act(db,'admin',{action:'saveTemplate',id,template:{...t,startMonth:'2022-12',day:31}},date('2026-06-01'));
  assert.equal((await expense(id,'2022-12')).exists,true);assert.equal((await expense(id,'2026-03')).exists,false);assert.equal((await expense(id,'2026-04')).exists,false);
});
test('舊待確認日圓自動補入，已入帳與略過紀錄保留，非日圓不改幣別',async()=>{
  const ref=db.collection('recurringExpenses').doc();const id=ref.id;
  await ref.set({...t,nextMonth:'2026-10',active:true});
  for (const [month,status,currency] of [['2026-07','skipped','JPY'],['2026-08','pending','JPY'],['2026-09','pending','TWD']]) await db.collection('recurringExpenseBills').doc(`${id}_${month}`).set({...t,templateId:id,month,status,currency,dueDate:`${month}-05`,createdAt:Timestamp.now()});
  await generate(db,id,date('2026-09-12'));assert.equal((await expense(id,'2026-08')).data().amountTwd,null);assert.equal((await expense(id,'2026-07')).exists,false);assert.equal((await expense(id,'2026-09')).exists,false);
  await generate(db,id,date('2026-09-12'));assert.equal((await expense(id,'2026-08')).data().amount,10000);
  await assert.rejects(()=>act(db,'admin',{action:'confirmBill',id:`${id}_2026-09`},date('2026-09-12')));
});

test('暫停中往前延伸起始月份，恢復時補齊新增歷史且保留暫停空檔',async()=>{
  const {id}=await act(db,'admin',{action:'saveTemplate',template:{...t,startMonth:'2026-01'}},date('2026-01-10'));
  await act(db,'admin',{action:'setActive',id,active:false},date('2026-02-01'));
  await act(db,'admin',{action:'saveTemplate',id,template:{...t,startMonth:'2025-12'}},date('2026-03-10'));
  assert.equal((await expense(id,'2025-12')).exists,false);
  await act(db,'admin',{action:'setActive',id,active:true},date('2026-04-10'));
  assert.equal((await expense(id,'2025-12')).exists,true);assert.equal((await expense(id,'2026-04')).exists,true);assert.equal((await expense(id,'2026-02')).exists,false);assert.equal((await expense(id,'2026-03')).exists,false);
});
