import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../src/lib/expenseSubscription.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {resilientExpenseSubscription:subscribe}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
test('App 重開監聽失敗後自動從備援取得支出',async()=>{
 const seen=[];const errors=[];let stopped=false;
 const sub=subscribe({listen:(next,fail)=>{fail(new Error());return()=>{stopped=true}},fetch:async()=>[100],next:x=>seen.push(x),failed:e=>errors.push(e),pollMs:10000});
 await tick();sub.stop();assert.deepEqual(seen,[[100]]);assert.deepEqual(errors,[]);assert.equal(stopped,true);
});
test('慢速備援不得覆蓋已恢復的即時資料',async()=>{
 let receive,fail,resolve;const seen=[];
 const sub=subscribe({listen:(n,e)=>{receive=n;fail=e;return()=>{}},fetch:()=>new Promise(r=>{resolve=r}),next:x=>seen.push(x),failed:()=>{},pollMs:10000});
 fail(new Error());receive([200]);resolve([100]);await tick();sub.stop();assert.deepEqual(seen,[[200]]);
});
test('失敗後自動重試，恢復網路後更新畫面',async()=>{
 let calls=0;const seen=[];const errors=[];
 const sub=subscribe({listen:(n,e)=>{e(new Error());return()=>{}},fetch:async()=>{if(++calls===1)throw new Error();return[300]},next:x=>seen.push(x),failed:e=>errors.push(e),pollMs:5});
 await tick();sub.stop();assert.equal(errors.length,1);assert(seen.some(x=>x[0]===300));
});
test('串流無回應會啟動備援，離開頁面後忽略尚未完成的回應',async()=>{
 let resolve;let calls=0;const seen=[];
 const sub=subscribe({listen:()=>()=>{},fetch:()=>{calls++;return new Promise(r=>{resolve=r})},next:x=>seen.push(x),failed:()=>{},timeoutMs:1});
 await tick();sub.stop();resolve([400]);await tick();assert.equal(calls,1);assert.deepEqual(seen,[]);
});
