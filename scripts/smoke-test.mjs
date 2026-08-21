#!/usr/bin/env node

const sources = [
  [
    "RNA data on data.gouv.fr",
    "https://www.data.gouv.fr/datasets/repertoire-national-des-associations/"
  ],
  [
    "JOAFE",
    "https://www.journal-officiel.gouv.fr/pages/associations/"
  ],
  [
    "Public subsidies data",
    "https://www.data.gouv.fr/datasets/?q=subventions+associations"
  ],
  [
    "data.gouv.fr API",
    "https://doc.data.gouv.fr/api/reference/"
  ]
];
let failures = 0;

for (const [title, url] of sources) {
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html,application/json,*/*', 'User-Agent': 'mcp-french-associations-smoke/0.1' } });
    const body = await response.text();
    const ok = response.ok && body.length > 50;
    console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${title} ${url}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${title} ${url} ${error.message}`);
  }
}

process.exitCode = failures === 0 ? 0 : 1;
