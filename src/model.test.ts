import { describe, expect, it } from 'vitest';
import { calculate, cents, combine, fileName, initialData, newInvoice, parseBackup, rowValue, sampleInvoice } from './model';
describe('exact invoice arithmetic',()=>{
 it('calculates the supplied eight-size example',()=>{expect(calculate(sampleInvoice())).toMatchObject({valid:true,pieces:120,total:11100000});});
 it('stores decimal rupees as exact paisa',()=>{expect(cents('0.29')).toBe(29);expect(rowValue({id:'r',size:'S',quantity:'3',price:'0.29'})).toBe(87);});
 it.each(['','-1','NaN','Infinity','1.123','1e3','0','1000000001'])('rejects invalid prices %s',price=>{expect(cents(price)).toBeNull();});
 it.each(['0','-1','1.5','abc','','1000001'])('rejects invalid quantities %s',quantity=>{expect(rowValue({id:'r',size:'M',quantity,price:'10'})).toBeNull();});
 it('blocks exports for incomplete rows without pretending the total is final',()=>{const i=sampleInvoice();i.rows.push({id:'x',size:'M',quantity:'',price:'4'});expect(calculate(i).valid).toBe(false);expect(calculate(i).amounts.at(-1)).toBeNull();});
 it('requires company, product and at least one row',()=>{expect(calculate(newInvoice()).valid).toBe(false);expect(calculate({...sampleInvoice(),rows:[]}).valid).toBe(false);});
 it('rejects unsafe accumulated totals',()=>{const invoice=sampleInvoice();invoice.rows=Array.from({length:100},(_,n)=>({id:String(n),size:'M',quantity:'100000',price:'1000000000'}));expect(calculate(invoice).valid).toBe(false);});
});
describe('consolidation and persistence',()=>{
 it('combines products without changing source invoices',()=>{const a=sampleInvoice();const b={...sampleInvoice(),product:'School shirt'};const merged=combine([a,b]);expect(calculate(merged)).toMatchObject({pieces:240,total:22200000,valid:true});expect(merged.rows[8].description).toBe('School shirt');expect(merged.rows[0].id).not.toBe(a.rows[0].id);expect(a.rows[0].description).toBeUndefined();});
 it('rejects cross-company and incomplete combinations',()=>{expect(()=>combine([sampleInvoice(),{...sampleInvoice(),company:'Other'}])).toThrow();expect(()=>combine([sampleInvoice(),newInvoice()])).toThrow();});
 it('round-trips browser backups',()=>{const data=initialData();expect(parseBackup(JSON.stringify(data))).toEqual(data);});
 it.each(['{}','null','{"invoices":[]}'])('rejects malformed backups %s',raw=>expect(()=>parseBackup(raw)).toThrow());
 it('makes safe filenames',()=>expect(fileName({...sampleInvoice(),company:'A/B: Co?'})).not.toMatch(/[/:?]/));
});
