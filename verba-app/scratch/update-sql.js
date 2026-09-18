const fs = require('fs');
const pool = JSON.parse(fs.readFileSync('scratch/h6-p4b-pool.json', 'utf8'));
const rows = pool.users.map(u => `    ('${u.userId}'::uuid, '${u.workId}'::uuid, '${u.documentId}'::uuid)`).join(',\n');
const sql = fs.readFileSync('scratch/h6-p4b-integrity.sql', 'utf8');
const newSql = sql.replace(/expected_mapping \(user_id, work_id, document_id\) AS \(\s*VALUES\s*[\s\S]*?\n\)/, 'expected_mapping (user_id, work_id, document_id) AS (\n  VALUES\n' + rows + '\n)');
fs.writeFileSync('scratch/h6-p4b-integrity.sql', newSql);
console.log('SQL replaced');
