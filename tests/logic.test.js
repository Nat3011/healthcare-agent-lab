import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rank,filterCases,reviewMessage} from '../dist/logic.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/catalogue.json',import.meta.url)));
test('curated scope contains human healthcare and active source records',()=>{assert.equal(data.cases.length,30);assert.ok(data.cases.every(c=>c.category==='Healthcare'&&c.sector==='Human healthcare'));assert.equal(data.examples.length,38);assert.ok(data.examples.every(e=>e.source_id==='hhs-fy25'&&!/Retired/i.test(e.stage)));assert.equal(data.selection.inventory_records,446);});
test('new shortlist and healthcare filters work',()=>{assert.deepEqual(rank(data,data.weights).slice(0,5).map(c=>c.id),['records','redaction','intake','guidance','translation']);assert.deepEqual(filterCases(data,data.weights,{query:'referral'}).map(c=>c.id),['intake']);assert.equal(filterCases(data,data.weights,{area:'Patient services'}).length,5);assert.equal(filterCases(data,data.weights,{scope:'Other healthcare'}).length,0);});
test('fictional demo still sends clinical messages for qualified review',()=>{assert.equal(reviewMessage(''),null);assert.equal(reviewMessage('Invoice copy').queue,'Billing team');assert.equal(reviewMessage('Cancel my appointment because of chest pain').queue,'Qualified care team');});
