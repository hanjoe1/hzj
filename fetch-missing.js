const { execSync } = require('child_process');
const fs = require('fs');

const missingIds = fs.readFileSync('C:/Users/Hanjie Zhang/hzj/ids-missing.txt', 'utf8').trim().split(/\r?\n/);
const results = [];

for (let i = 0; i < missingIds.length; i += 5) {
  const batch = missingIds.slice(i, i + 5);
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
          results.push({
            id: attr.work_item_id,
            name: attr.work_item_name,
            status: attr.work_item_status ? attr.work_item_status.name : '',
            product_owners: poNames,
            creator: attr.create_by ? attr.create_by.name : '',
            creator_email: attr.create_by ? attr.create_by.email : ''
          });
        }
      } catch (e) {}
    }
  } catch (e) {
    process.stderr.write(`Batch ${i} failed\n`);
  }
  if (i + 5 < missingIds.length) {
    execSync('ping -n 3 127.0.0.1 > nul', { encoding: 'utf8' });
  }
  process.stderr.write(`Progress: ${Math.min(i + 5, missingIds.length)}/${missingIds.length}\n`);
}

fs.writeFileSync('C:/Users/Hanjie Zhang/hzj/missing-results.json', JSON.stringify(results, null, 2));
console.log(`Fetched: ${results.length}`);
