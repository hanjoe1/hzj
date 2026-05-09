const { execSync } = require('child_process');
const fs = require('fs');

const ids = fs.readFileSync('C:/Users/Hanjie Zhang/hzj/work-item-ids.txt', 'utf8').trim().split(/\r?\n/);
const results = [];
const batchSize = 10;

for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize);
  const idArg = batch.join(',');
  try {
    const out = execSync(
      `meegle workitem +batch-get --work-item-ids "${idArg}" --project-key atome_agile --format ndjson`,
      { encoding: 'utf8', timeout: 60000 }
    );
    const lines = out.trim().split(/\r?\n/);
    for (const line of lines) {
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
            product_owners: poNames
          });
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`Batch starting at ${i} failed:`, e.message.substring(0, 100));
  }
  if (i + batchSize < ids.length) {
    execSync('ping -n 3 127.0.0.1 > nul', { encoding: 'utf8' });
  }
  process.stderr.write(`Progress: ${Math.min(i + batchSize, ids.length)}/${ids.length}\n`);
}

fs.writeFileSync('C:/Users/Hanjie Zhang/hzj/product-owners.json', JSON.stringify(results, null, 2));
console.log(`Done. Total items with data: ${results.length}`);
