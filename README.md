# mcp-french-associations

MCP server for French associations: RNA, JOAFE, grants/subventions, and public dataset discovery.

## Tools

Run the MCP and call `french_associations_get_sources` first to inspect source coverage. This server also exposes domain-specific tools for the topic described above.

- `french_associations_search_datasets`
- `french_associations_get_dataset`
- `french_associations_build_search_plan`
- `french_associations_search_subsidies`

## Install

```bash
npm install
npm run build
npm test
npm run dev
```

## Claude Desktop

```json
{
  "mcpServers": {
    "french-associations": {
      "command": "npx",
      "args": ["mcp-french-associations"]
    }
  }
}
```

## Sources

- RNA data on data.gouv.fr: https://www.data.gouv.fr/datasets/repertoire-national-des-associations/
- JOAFE: https://www.journal-officiel.gouv.fr/pages/associations/
- Public subsidies data: https://www.data.gouv.fr/datasets/?q=subventions+associations
- data.gouv.fr API: https://doc.data.gouv.fr/api/reference/

## Publishing

See [docs/publishing.md](docs/publishing.md).

## Glama / Docker

The repo includes `Dockerfile` and `glama.json`.

Build steps:

```json
["npm install", "npm run build"]
```

CMD arguments:

```json
["node", "dist/index.js"]
```

## Safety

This MCP helps agents discover and summarize public sources. It is not an official authority. Verify decisions against the competent public service or original data producer.

## License

MIT
