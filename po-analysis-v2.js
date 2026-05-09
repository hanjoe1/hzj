const fs = require('fs');

const excluded = [
  'Jing Wu', 'Mei Bai', 'Qili Fan', 'Qingqing Huang', 'Melen Su',
  'Huali Li', 'Chunyi Zhao', 'Cheng Chen', 'Guangming Geng',
  'Wilson', 'Shouwei Yan', 'Zilong Fu', 'Ika Febriana', 'Karel Saputra'
];
const isExcluded = (name) => excluded.some(e => name.includes(e));

const poData = JSON.parse(fs.readFileSync('C:/Users/Hanjie Zhang/hzj/product-owners.json', 'utf8'));
const missingData = JSON.parse(fs.readFileSync('C:/Users/Hanjie Zhang/hzj/missing-results.json', 'utf8'));

const poMap = {};
for (const item of [...poData, ...missingData]) {
  const validPO = item.product_owners.filter(n => !isExcluded(n));
  poMap[String(item.id)] = validPO;
}

const mqlFiles = [
  'C:/Users/Hanjie Zhang/.cursor/projects/c-Users-Hanjie-Zhang-hzj/agent-tools/a3aebbeb-6dc7-4d5e-a34c-b6d65a99dab5.txt',
  'C:/Users/Hanjie Zhang/.cursor/projects/c-Users-Hanjie-Zhang-hzj/agent-tools/526ae353-6a6e-4d6e-8b75-f326463fb4a3.txt',
  'C:/Users/Hanjie Zhang/.cursor/projects/c-Users-Hanjie-Zhang-hzj/agent-tools/a3f10291-dc99-402e-989d-5091d8d1048d.txt',
  'C:/Users/Hanjie Zhang/.cursor/projects/c-Users-Hanjie-Zhang-hzj/agent-tools/2005db6e-797f-47e2-a08e-be557401acc4.txt',
  'C:/Users/Hanjie Zhang/.cursor/projects/c-Users-Hanjie-Zhang-hzj/agent-tools/c5893c0f-43dd-4c98-9b4d-ada89061f598.txt',
];

function extractField(fields, key) {
  const f = fields.find(x => x.key === key);
  if (!f || !f.value) return null;
  return f.value;
}

function getStatus(fields) {
  const v = extractField(fields, 'work_item_status');
  if (!v) return '';
  if (v.key_label_value_list && v.key_label_value_list.length > 0) return v.key_label_value_list[0].label || '';
  if (v.string_value) return v.string_value;
  return '';
}

function getPriority(fields) {
  const v = extractField(fields, 'priority');
  if (!v) return '';
  if (v.key_label_value) return v.key_label_value.label || '';
  if (v.string_value) return v.string_value;
  return '';
}

function getStartTime(fields) {
  const v = extractField(fields, 'start_time');
  if (!v) return '';
  return v.string_value || v.date_value || '';
}

function getName(fields) {
  const v = extractField(fields, 'name');
  if (!v) return '';
  return v.string_value || '';
}

function getWorkItemId(fields) {
  const v = extractField(fields, 'work_item_id');
  if (!v) return '';
  return String(v.long_value || v.string_value || '');
}

function getCountry(fields) {
  const v = extractField(fields, 'field_021f79');
  if (!v) return [];
  if (v.key_label_value_list) return v.key_label_value_list.map(x => x.label || '');
  return [];
}

function getBusiness(fields) {
  const v = extractField(fields, 'business');
  if (!v) return '';
  if (v.cascade_key_label_value) {
    let s = v.cascade_key_label_value.label || '';
    if (v.cascade_key_label_value.children && v.cascade_key_label_value.children.length > 0) {
      s += '>' + v.cascade_key_label_value.children.map(c => c.label || '').join(',');
    }
    return s;
  }
  if (v.string_value) return v.string_value;
  return JSON.stringify(v);
}

function getComplexity(fields) {
  const v = extractField(fields, 'field_faac49');
  if (!v) return 0;
  if (v.key_label_value_list) return v.key_label_value_list.length;
  if (v.work_item_related_list_value) return v.work_item_related_list_value.length;
  if (Array.isArray(v)) return v.length;
  return 0;
}

const reqStages = ['Backlog', 'Pending Biz Review', 'Pending PRD Design', 'PRD Designing', 'Pending PRD Review', 'Pending UI/UX Review'];
const devStages = ['To be dev scheduled', 'In development', 'Pending testing', 'Testing', 'Pending release'];

const items = {};
for (const file of mqlFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  const records = json.data && json.data['1'] ? json.data['1'] : [];
  for (const rec of records) {
    const fields = rec.moql_field_list || [];
    const id = getWorkItemId(fields);
    if (!id || id === 'null' || id === '') continue;
    if (items[id]) continue;

    const status = getStatus(fields);
    const priority = getPriority(fields);
    const startTime = getStartTime(fields);
    const businessStr = getBusiness(fields);
    const countries = getCountry(fields);
    const twCount = getComplexity(fields);
    const name = getName(fields);

    let complexSize = 'small';
    let complexWeight = 1;
    if (twCount >= 3) { complexSize = 'large'; complexWeight = 3; }
    else if (twCount >= 1) { complexSize = 'medium'; complexWeight = 2; }

    let stageType = 'other';
    let stageWeight = 1;
    if (reqStages.includes(status)) { stageType = 'req'; stageWeight = 2; }
    else if (devStages.includes(status)) { stageType = 'dev'; stageWeight = 1.5; }

    const daysSince = startTime ? Math.floor((new Date('2026-05-06') - new Date(startTime)) / 86400000) : 0;

    const productLines = [];
    const hasCountry = (c) => countries.includes(c) || countries.includes('All');
    if (businessStr.includes('Card') && hasCountry('PH')) productLines.push('PH Card');
    if (businessStr.includes('Atome Cash') && hasCountry('PH')) productLines.push('PH Cash');
    if (businessStr.includes('Saving') && hasCountry('PH')) productLines.push('PH Saving');
    if (businessStr.includes('BNPL') && hasCountry('PH')) productLines.push('PH Growth');
    if (businessStr.includes('Card') && hasCountry('MY')) productLines.push('MY Card');
    if (businessStr.includes('BNPL') && hasCountry('ID')) productLines.push('ID BMI');
    if (hasCountry('ID') && (/VA|paylater|AFI/i.test(name) || businessStr.includes('KP'))) productLines.push('ID VA Paylater');
    if (businessStr.includes('Atome Cash') && hasCountry('ID')) productLines.push('ID Atome Cash');

    items[id] = {
      id, name, status, priority, startTime, businessStr, countries,
      complexSize, complexWeight, stageType, stageWeight, daysSince,
      productLines, score: stageWeight * complexWeight,
      pos: poMap[id] || []
    };
  }
}

const poStats = {};
for (const item of Object.values(items)) {
  for (const po of item.pos) {
    if (!poStats[po]) poStats[po] = { name: po, items: [], totalScore: 0, req: 0, dev: 0, large: 0, medium: 0, small: 0, p0: 0, p1: 0, lines: new Set(), oldest: null };
    const s = poStats[po];
    s.items.push(item);
    s.totalScore += item.score;
    if (item.stageType === 'req') s.req++;
    if (item.stageType === 'dev') s.dev++;
    if (item.complexSize === 'large') s.large++;
    if (item.complexSize === 'medium') s.medium++;
    if (item.complexSize === 'small') s.small++;
    if (item.priority === 'P0') s.p0++;
    if (item.priority === 'P1') s.p1++;
    item.productLines.forEach(l => s.lines.add(l));
    if (!s.oldest || item.daysSince > s.oldest.daysSince) s.oldest = item;
  }
}

const sorted = Object.values(poStats).sort((a, b) => b.totalScore - a.totalScore);

console.log('### 表 5-1：Product Owner 负荷排名');
console.log('');
console.log('> 综合负荷分 = Σ(阶段权重 × 复杂度权重)，其中需求阶段=2/开发阶段=1.5，小型=1/中型=2/大型=3');
console.log('');
console.log('| 排名 | Product Owner | 在途 | 需求 | 开发 | 综合分 | 涉及产品线 | P0 | P1 | 大 | 中 | 小 | 最老在途(挂龄) |');
console.log('|-----:|--------------|-----:|-----:|-----:|------:|-----------|---:|---:|---:|---:|---:|---------------|');

sorted.forEach((s, i) => {
  const lines = s.lines.size > 0 ? [...s.lines].join('、') : '跨线';
  const oldest = s.oldest ? `${s.oldest.name.substring(0, 30)} (${s.oldest.daysSince}天)` : '';
  console.log(`| ${i + 1} | ${s.name} | ${s.items.length} | ${s.req} | ${s.dev} | ${s.totalScore.toFixed(1)} | ${lines} | ${s.p0} | ${s.p1} | ${s.large} | ${s.medium} | ${s.small} | ${oldest} |`);
});

console.log('');

// Table 2: per product line
const lineStats = {};
const allLines = ['PH Card', 'PH Cash', 'PH Saving', 'PH Growth', 'MY Card', 'ID BMI', 'ID VA Paylater', 'ID Atome Cash'];
for (const line of allLines) lineStats[line] = { pos: new Set(), inFlight: 0, reqStage: 0, topPO: {} };

for (const item of Object.values(items)) {
  for (const po of item.pos) {
    for (const line of item.productLines) {
      if (!allLines.includes(line)) continue;
      lineStats[line].pos.add(po);
      lineStats[line].inFlight++;
      if (item.stageType === 'req') lineStats[line].reqStage++;
      if (!lineStats[line].topPO[po]) lineStats[line].topPO[po] = 0;
      lineStats[line].topPO[po]++;
    }
  }
}

console.log('### 表 5-2：各产品线 Product Owner 配置');
console.log('');
console.log('| 产品线 | PO 人数 | 人均在途 | 人均需求阶段 | 主要 PO（前3） |');
console.log('|--------|--------:|--------:|------------:|---------------|');

for (const line of allLines) {
  const ls = lineStats[line];
  const poCount = ls.pos.size;
  const avgInFlight = poCount > 0 ? (ls.inFlight / poCount).toFixed(2) : '—';
  const avgReq = poCount > 0 ? (ls.reqStage / poCount).toFixed(2) : '—';
  const topPOs = Object.entries(ls.topPO).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n.split(' ')[0]}(${c})`).join('、') || '—';
  console.log(`| ${line} | ${poCount} | ${avgInFlight} | ${avgReq} | ${topPOs} |`);
}

// Count items with no valid PO
const noPOItems = Object.values(items).filter(item => item.pos.length === 0);
console.log(`\n无有效 PO 的 Feature: ${noPOItems.length} 条`);
