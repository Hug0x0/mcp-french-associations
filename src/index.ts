#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CONFIG = {
  "name": "mcp-french-associations",
  "prefix": "french_associations",
  "description": "MCP server for French associations: RNA, JOAFE, grants/subventions, and public dataset discovery.",
  "sources": [
    {
      "title": "RNA data on data.gouv.fr",
      "url": "https://www.data.gouv.fr/datasets/repertoire-national-des-associations/"
    },
    {
      "title": "JOAFE",
      "url": "https://www.journal-officiel.gouv.fr/pages/associations/"
    },
    {
      "title": "Public subsidies data",
      "url": "https://www.data.gouv.fr/datasets/?q=subventions+associations"
    },
    {
      "title": "data.gouv.fr API",
      "url": "https://doc.data.gouv.fr/api/reference/"
    }
  ]
} as const;

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function jsonResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(message: string): ToolResult {
  const data = { error: message };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,text/plain,application/xml,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function dataGouvDatasetSummary(dataset: Record<string, unknown>) {
  return {
    id: dataset.id,
    slug: dataset.slug,
    title: dataset.title,
    page: dataset.page,
    organization: dataset.organization && typeof dataset.organization === 'object'
      ? (dataset.organization as Record<string, unknown>).name
      : undefined,
    resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
  };
}

async function searchDataGouv(query: string, pageSize: number) {
  const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(pageSize));
  const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
  return {
    query,
    total: data.total,
    datasets: (data.data ?? []).map(dataGouvDatasetSummary),
  };
}

async function getDataGouvDataset(dataset: string) {
  const url = `https://www.data.gouv.fr/api/1/datasets/${encodeURIComponent(dataset)}/`;
  const data = await fetchJson<Record<string, unknown>>(url);
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    page: data.page,
    organization: data.organization && typeof data.organization === 'object'
      ? (data.organization as Record<string, unknown>).name
      : undefined,
    tags: data.tags,
    resources: Array.isArray(data.resources)
      ? data.resources.slice(0, 30).map((resource) => ({
          id: resource.id,
          title: resource.title,
          type: resource.type,
          format: resource.format,
          url: resource.url,
          latest: resource.latest,
        }))
      : [],
  };
}

function normalizePortalUrl(portalUrl: string): string {
  return portalUrl.replace(/\/$/, '');
}

async function odsRecords(portalUrl: string, dataset: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${normalizePortalUrl(portalUrl)}/api/explore/v2.1/catalog/datasets/${encodeURIComponent(dataset)}/records`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return fetchJson<Record<string, unknown>>(url.toString());
}

const server = new McpServer({ name: CONFIG.name, version: '0.1.0' });

server.tool(
  `${CONFIG.prefix}_get_sources`,
  'List curated sources used by this MCP.',
  {},
  async () => jsonResult({ server: CONFIG.name, description: CONFIG.description, sources: CONFIG.sources })
);

server.tool(
  `${CONFIG.prefix}_fetch_source_excerpt`,
  'Fetch a short text excerpt from a curated source by index or title keyword.',
  {
    source_key: z.string().describe('Source index, title keyword, or URL fragment.'),
    max_chars: z.number().int().min(200).max(4000).default(1200),
  },
  async ({ source_key, max_chars }) => {
    const normalized = source_key.toLowerCase();
    const source = CONFIG.sources.find((item, index) =>
      String(index + 1) === normalized ||
      item.title.toLowerCase().includes(normalized) ||
      item.url.toLowerCase().includes(normalized)
    );
    if (!source) return errorResult(`Unknown source: ${source_key}`);
    try {
      const text = await fetchText(source.url);
      return jsonResult({ source, excerpt: textFromHtml(text).slice(0, max_chars) });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch source excerpt');
    }
  }
);


server.tool('french_associations_search_datasets', 'Search data.gouv.fr for association datasets: RNA, JOAFE, subsidies, local grants.', {
  query: z.string().default('répertoire national associations RNA'),
  page_size: z.number().int().min(1).max(50).default(10),
}, async ({ query, page_size }) => {
  try { return jsonResult(await searchDataGouv(query, page_size)); } catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to search association datasets'); }
});

server.tool('french_associations_get_dataset', 'Inspect a data.gouv.fr association-related dataset by slug or id and list its usable resources.', {
  dataset: z.string().describe('Dataset slug or id from data.gouv.fr.'),
}, async ({ dataset }) => {
  try { return jsonResult(await getDataGouvDataset(dataset)); } catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to inspect association dataset'); }
});

server.tool('french_associations_build_search_plan', 'Build a practical public-source search plan for a French association name or RNA id.', {
  name_or_id: z.string().describe('Association name or RNA id, e.g. W123456789.'),
}, async ({ name_or_id }) => jsonResult({
  input: name_or_id,
  queries: [
    { source: 'RNA', query: name_or_id },
    { source: 'JOAFE', query: name_or_id },
    { source: 'Subventions publiques', query: `subventions association ${name_or_id}` },
    { source: 'SIRENE', query: `SIRENE association ${name_or_id}` },
  ],
  official_sources: CONFIG.sources,
}));

server.tool('french_associations_search_subsidies', 'Search data.gouv.fr for public subsidy datasets related to associations.', {
  place_or_topic: z.string().optional(),
  page_size: z.number().int().min(1).max(50).default(10),
}, async ({ place_or_topic, page_size }) => {
  try { return jsonResult(await searchDataGouv(place_or_topic ? `subventions associations ${place_or_topic}` : 'subventions associations', page_size)); }
  catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to search subsidy datasets'); }
});


async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
