// Pages through Get-Feature-Cost and keeps try-on / tone SKUs. Read-only, free.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
let token = null, all = [];
do {
  const req = { page_size: 20, ...(token ? { starting_token: token } : {}) };
  const out = JSON.parse(execFileSync('node', ['--env-file=.env.local', 'scripts/mcp.mjs', 'fashion', 'call', 'Get-Feature-Cost', JSON.stringify({ request: req })], { encoding: 'utf8' }));
  const body = JSON.parse(out.result.content[0].text).result;
  all.push(...body.skus); token = body.next_token;
} while (token);
writeFileSync('spikes-out/cost-all.json', JSON.stringify(all, null, 2));
for (const s of all.filter((s) => /cloth|earring|necklace|scarf|color tone|fabric|saree|sari/i.test(s.description)))
  console.log(s.amount, s.unit, '|', s.description, '|', s.run_task_url);
