const { execSync } = require('child_process');
const fs = require('fs');

const excluded = ['Jing Wu', 'Mei Bai'];
const isExcluded = (name) => excluded.some(e => name.includes(e));

const poData = JSON.parse(fs.readFileSync('C:/Users/Hanjie Zhang/hzj/product-owners.json', 'utf8'));
const missingData = JSON.parse(fs.readFileSync('C:/Users/Hanjie Zhang/hzj/missing-results.json', 'utf8'));

const allWithPO = [...poData, ...missingData.filter(m => !poData.some(p => String(p.id) === String(m.id)))];

const noPOIds = allWithPO
  .filter(item => {
    const valid = item.product_owners.filter(n => !isExcluded(n));
    return valid.length === 0;
  })
  .map(item => String(item.id));

console.log(`无有效 PO 的 Feature: ${noPOIds.length} 条`);
console.log('IDs:', noPOIds.join(','));

const results = [];
for (let i = 0; i < noPOIds.length; i += 5) {
  const batch = noPOIds.slice(i, i + 5);
  try {
    const out = execSync(
      `meegle workitem +batch-get --work-item-ids "${batch.join(',')}" --project-key atome_agile --format ndjson`,
      { encoding: 'utf8', timeout: 30000 }
    );
    for (const line of out.trim().split(/\r?\n/)) {
      try {
        const obj = JSON.parse(line);
        if (obj.data && obj.data.work_item_attribute) {
          const attr = obj.data.work_item_attribute;
          const po = (attr.role_members || []).find(r => r.key === 'product_owner');
          const poNames = po && po.members ? po.members.map(m => m.name) : [];

          const item = {
            id: attr.work_item_id,
            name: attr.work_item_name,
            status: attr.work_item_status ? attr.work_item_status.name : '',
            original_po: poNames,
            valid_po: poNames.filter(n => !isExcluded(n)),
            creator: attr.create_by ? attr.create_by.name : '',
            creator_email: attr.create_by ? attr.create_by.email : '',
            current_node_owners: [],
            roles: {}
          };

          for (const role of (attr.role_members || [])) {
            if (role.members && role.members.length > 0) {
              item.roles[role.name] = role.members.map(m => m.name);
            }
          }

          if (obj.data.work_item_current_node) {
            for (const node of obj.data.work_item_current_node) {
              if (node.owners) {
                item.current_node_owners.push(...node.owners.map(o => `${o.name} @ ${node.name}`));
              }
            }
          }

          results.push(item);
        }
      } catch (e) {}
    }
  } catch (e) {
    process.stderr.write(`Batch ${i} failed: ${e.message.substring(0, 80)}\n`);
  }
  if (i + 5 < noPOIds.length) {
    execSync('ping -n 3 127.0.0.1 > nul', { encoding: 'utf8' });
  }
}

fs.writeFileSync('C:/Users/Hanjie Zhang/hzj/no-po-full-details.json', JSON.stringify(results, null, 2));
console.log(`\n成功获取: ${results.length} 条`);

console.log('\n' + '='.repeat(130));
console.log('无 PO Feature 详情');
console.log('='.repeat(130));

for (const item of results) {
  console.log(`\n[${item.id}] ${item.name}`);
  console.log(`  状态: ${item.status}`);
  console.log(`  原始PO: ${item.original_po.length > 0 ? item.original_po.join(', ') : '(空)'}`);
  console.log(`  Creator: ${item.creator} <${item.creator_email}>`);
  console.log(`  当前节点: ${item.current_node_owners.length > 0 ? item.current_node_owners.join(' | ') : '(无)'}`);
  const roleStr = Object.entries(item.roles).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' | ');
  console.log(`  角色: ${roleStr || '(无角色分配)'}`);
}

console.log('\n' + '='.repeat(80));
console.log('Creator 汇总');
console.log('='.repeat(80));
const creatorMap = {};
for (const item of results) {
  const key = `${item.creator} <${item.creator_email}>`;
  if (!creatorMap[key]) creatorMap[key] = [];
  creatorMap[key].push(item.name);
}
Object.entries(creatorMap).sort((a, b) => b[1].length - a[1].length).forEach(([creator, items]) => {
  console.log(`\n${creator} (${items.length} 条):`);
  items.forEach(n => console.log(`  - ${n}`));
});
