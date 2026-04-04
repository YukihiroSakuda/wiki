import {
  SearchClient,
  SearchIndexClient,
  AzureKeyCredential,
  SearchIndex,
} from "@azure/search-documents";
import { env } from "@/lib/env";

export interface WikiPageDocument {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  authorName: string;
  updatedAt: string;
  /** text-embedding-3-large vector (3072 dims) */
  contentVector?: number[];
}

const INDEX_NAME = env.AZURE_AI_SEARCH_INDEX_NAME;

function getCredential() {
  return new AzureKeyCredential(env.AZURE_AI_SEARCH_API_KEY);
}

export function getSearchClient(): SearchClient<WikiPageDocument> | null {
  if (!env.isAzureSearchConfigured()) return null;
  return new SearchClient<WikiPageDocument>(
    env.AZURE_AI_SEARCH_ENDPOINT,
    INDEX_NAME,
    getCredential()
  );
}

export function getIndexClient(): SearchIndexClient | null {
  if (!env.isAzureSearchConfigured()) return null;
  return new SearchIndexClient(env.AZURE_AI_SEARCH_ENDPOINT, getCredential());
}

/** Create or update the wiki-pages index */
export async function ensureIndex(): Promise<void> {
  const client = getIndexClient();
  if (!client) return;

  const index: SearchIndex = {
    name: INDEX_NAME,
    fields: [
      { name: "id", type: "Edm.String", key: true, filterable: true },
      { name: "slug", type: "Edm.String", filterable: true },
      { name: "title", type: "Edm.String", searchable: true, analyzerName: "standard.lucene" },
      { name: "content", type: "Edm.String", searchable: true, analyzerName: "standard.lucene" },
      { name: "tags", type: "Collection(Edm.String)", searchable: true, filterable: true },
      { name: "authorName", type: "Edm.String" },
      { name: "updatedAt", type: "Edm.DateTimeOffset", filterable: true, sortable: true },
      {
        name: "contentVector",
        type: "Collection(Edm.Single)",
        searchable: true,
        hidden: true,
        vectorSearchDimensions: 3072,
        vectorSearchProfileName: "wiki-vector-profile",
      },
    ],
    vectorSearch: {
      algorithms: [
        {
          name: "wiki-hnsw",
          kind: "hnsw",
          parameters: { m: 4, efConstruction: 400, efSearch: 500, metric: "cosine" },
        },
      ],
      profiles: [{ name: "wiki-vector-profile", algorithmConfigurationName: "wiki-hnsw" }],
    },
    scoringProfiles: [],
    corsOptions: undefined,
  };

  await client.createOrUpdateIndex(index);
}

/** Upsert a page document into the index */
export async function indexPage(doc: WikiPageDocument): Promise<void> {
  const client = getSearchClient();
  if (!client) return;
  await client.mergeOrUploadDocuments([doc]);
}

/** Delete a page from the index */
export async function deletePageFromIndex(id: string): Promise<void> {
  const client = getSearchClient();
  if (!client) return;
  await client.deleteDocuments("id", [id]);
}

/** Full-text + optional vector search */
export async function searchIndex(
  query: string,
  opts: { vector?: number[]; top?: number; filter?: string } = {}
): Promise<WikiPageDocument[]> {
  const client = getSearchClient();
  if (!client) return [];

  const { vector, top = 10, filter } = opts;

  const searchOptions: Parameters<typeof client.search>[1] = {
    top,
    filter,
    select: ["id", "slug", "title", "content", "tags", "authorName", "updatedAt"],
    ...(vector
      ? {
          vectorSearchOptions: {
            queries: [
              {
                kind: "vector",
                vector,
                kNearestNeighborsCount: top,
                fields: ["contentVector"],
              },
            ],
          },
        }
      : {}),
  };

  const results: WikiPageDocument[] = [];
  const response = await client.search(query || "*", searchOptions);

  for await (const result of response.results) {
    results.push(result.document);
  }

  return results;
}
