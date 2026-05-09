const { execSync } = require('child_process');

const queries = [
  {
    label: 'story credit',
    mql: `SELECT \`name\`, \`work_item_status\`, \`priority\` FROM \`66a7151850bbd9035a2bb2bb\`.\`story\` WHERE \`name\` LIKE '%credit%'`
  },
  {
    label: 'story score',
    mql: `SELECT \`name\`, \`work_item_status\`, \`priority\` FROM \`66a7151850bbd9035a2bb2bb\`.\`story\` WHERE \`name\` LIKE '%score%'`
  },
  {
    label: 'issue credit',
    mql: `SELECT \`name\`, \`work_item_status\`, \`priority\` FROM \`66a7151850bbd9035a2bb2bb\`.\`issue\` WHERE \`name\` LIKE '%credit%'`
  },
  {
    label: 'issue score',
    mql: `SELECT \`name\`, \`work_item_status\`, \`priority\` FROM \`66a7151850bbd9035a2bb2bb\`.\`issue\` WHERE \`name\` LIKE '%score%'`
  },
  {
    label: 'story 信用',
    mql: `SELECT \`name\`, \`work_item_status\`, \`priority\` FROM \`66a7151850bbd9035a2bb2bb\`.\`story\` WHERE \`name\` LIKE '%信用%'`
  },
  {
    label: 'story Atome Score',
    mql: `SELECT \`name\`, \`work_item_status\`, \`priority\` FROM \`66a7151850bbd9035a2bb2bb\`.\`story\` WHERE \`name\` LIKE '%Atome Score%'`
  }
];

for (const q of queries) {
  console.log(`\n=== ${q.label} ===`);
  try {
    const mqlArg = JSON.stringify(q.mql);
    const cmd = `meegle workitem query --project-key "66a7151850bbd9035a2bb2bb" --mql ${mqlArg} --format json`;
    const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 5 });
    const data = JSON.parse(result);
    if (data.work_items && data.work_items.length > 0) {
      for (const item of data.work_items) {
        console.log(`  [${item.work_item_id}] ${item.name || item.work_item_name || JSON.stringify(item.fields)}`);
      }
    } else {
      console.log('  No results');
      console.log('  Raw:', JSON.stringify(data).substring(0, 300));
    }
  } catch (e) {
    const stderr = e.stderr || '';
    const stdout = e.stdout || '';
    console.log('  Error:', (stdout + stderr).substring(0, 500));
  }
}
