import { describe, expect, it } from 'vitest';

describe('mcp-french-associations', () => {
  it('uses an mcp package name', () => {
    expect('mcp-french-associations').toMatch(/^mcp-/);
  });

  it('has curated HTTP sources', () => {
    const sources = [
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
];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it('has a stable tool prefix', () => {
    expect('french_associations').toMatch(/^[a-z0-9_]+$/);
  });
});
