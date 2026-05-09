const https = require('https');

const APP_ID = 'cli_a844766b6cb8d010';
const APP_SECRET = 'DuJQvu6ZurMtqUjgpZSdZcbTeXAMizXe';
const BASE = 'open.larksuite.com';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { hostname: BASE, path, method, headers };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  const res = await request('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: APP_ID, app_secret: APP_SECRET
  });
  if (res.tenant_access_token) return res.tenant_access_token;
  throw new Error('Failed to get token: ' + JSON.stringify(res));
}

async function getDocRawContent(token, docId) {
  const res = await request('GET', `/open-apis/docx/v1/documents/${docId}/raw_content`, null, token);
  return res;
}

async function getDocBlocks(token, docId, pageToken) {
  let path = `/open-apis/docx/v1/documents/${docId}/blocks?page_size=500`;
  if (pageToken) path += `&page_token=${pageToken}`;
  return request('GET', path, null, token);
}

async function main() {
  const docIds = [
    'ZI8ZdYCZKoEig2x5XPSlc2Qggsh',
    'GkS8dky3xo43qnxNROBlZdEog7e',
    'ZKAcdNdHGorkkTx9rIKlTy51gWh',
    'DlxVd4RMZoG1bgx8407lAJj5g4d',
    'TryRdzEECoH6cfx1u19lmHuYg9d',
    'XZDAdvSi8oaS8hx9VGblpTUAg8d',
    'MsMUdDRXFoa0Ixx8z0Xlh6Dag95',
  ];

  console.log('Getting tenant access token...');
  const token = await getToken();
  console.log('Token obtained.\n');

  for (const docId of docIds) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Document: ${docId}`);
    console.log(`URL: https://advancegroup.sg.larksuite.com/docx/${docId}`);
    console.log('='.repeat(80));

    const raw = await getDocRawContent(token, docId);
    if (raw.code === 0) {
      console.log('\n--- RAW CONTENT ---');
      console.log(raw.data?.content || 'No content');
    } else {
      console.log('Error:', JSON.stringify(raw));
    }
    console.log('\n');
  }
}

main().catch(console.error);
