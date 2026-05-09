const fs = require('fs');
const { execSync } = require('child_process');

const excluded = ['Jing Wu', 'Mei Bai'];
const isExcluded = (name) => excluded.some(e => name.includes(e));

const batchPart1 = fs.readFileSync('C:/Users/Hanjie Zhang/hzj/batch-part1.ndjson', 'utf8').trim().split(/\r?\n/);
const batchPart2 = fs.readFileSync('C:/Users/Hanjie Zhang/hzj/batch-part2.ndjson', 'utf8').trim().split(/\r?\n/);
const missingData = JSON.parse(fs.readFileSync('C:/Users/Hanjie Zhang/hzj/missing-results.json', 'utf8'));

const allItems = {};

for (const line of [...batchPart1, ...batchPart2]) {
  try {
    const obj = JSON.parse(line);
    if (obj.data && obj.data.work_item_attribute) {
      const attr = obj.data.work_item_attribute;
      const po = (attr.role_members || []).find(r => r.key === 'product_owner');
      const poNames = po && po.members ? po.members.map(m => m.name) : [];
      const validPO = poNames.filter(n => !isExcluded(n));
      
      allItems[attr.work_item_id] = {
        id: attr.work_item_id,
        name: attr.work_item_name,
        status: attr.work_item_status ? attr.work_item_status.name : '',
        product_owners: poNames,
        valid_po: validPO,
        creator: attr.create_by ? attr.create_by.name : '',
        creator_email: attr.create_by ? attr.create_by.email : '',
        current_node_owners: [],
        all_roles: (attr.role_members || []).map(r => ({
          role: r.name,
          members: r.members ? r.members.map(m => m.name) : []
        }))
      };
      
      if (obj.data.work_item_current_node) {
        for (const node of obj.data.work_item_current_node) {
          if (node.owners) {
            allItems[attr.work_item_id].current_node_owners.push(
              ...node.owners.map(o => ({ name: o.name, node: node.name }))
            );
          }
        }
      }
    }
  } catch (e) {}
}

for (const item of missingData) {
  if (!allItems[item.id]) {
    const validPO = item.product_owners.filter(n => !isExcluded(n));
    allItems[item.id] = {
      ...item,
      valid_po: validPO,
      current_node_owners: [],
      all_roles: []
    };
  }
}

const noPOItems = Object.values(allItems).filter(item => item.valid_po.length === 0);

console.log(`\n总获取 Feature: ${Object.keys(allItems).length}`);
console.log(`无有效 PO: ${noPOItems.length}`);
console.log(`\n${'='.repeat(120)}`);
console.log(`无 Product Owner 的 Feature 详情（含 Creator 及当前节点负责人）`);
console.log(`${'='.repeat(120)}\n`);

const knownPMs = {};

for (const item of noPOItems.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`ID: ${item.id}`);
  console.log(`名称: ${item.name}`);
  console.log(`状态: ${item.status}`);
  console.log(`原始PO: ${item.product_owners.length > 0 ? item.product_owners.join(', ') : '(空)'}`);
  console.log(`Creator: ${item.creator} (${item.creator_email})`);
  console.log(`当前节点负责人: ${item.current_node_owners.length > 0 ? item.current_node_owners.map(o => `${o.name}@${o.node}`).join(', ') : '(空)'}`);
  console.log(`全部角色: ${item.all_roles.map(r => `${r.role}:[${r.members.join(',')}]`).join(' | ')}`);
  console.log('---');
  
  if (item.creator) {
    knownPMs[item.creator] = (knownPMs[item.creator] || 0) + 1;
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`Creator 统计（无PO的Feature中）`);
console.log(`${'='.repeat(80)}\n`);

const sorted = Object.entries(knownPMs).sort((a, b) => b[1] - a[1]);
for (const [name, count] of sorted) {
  console.log(`  ${name}: ${count} 条`);
}

const output = noPOItems.map(item => ({
  id: item.id,
  name: item.name,
  status: item.status,
  original_po: item.product_owners,
  creator: item.creator,
  creator_email: item.creator_email,
  current_node_owners: item.current_node_owners,
  all_roles: item.all_roles
}));

fs.writeFileSync('C:/Users/Hanjie Zhang/hzj/no-po-details.json', JSON.stringify(output, null, 2));
