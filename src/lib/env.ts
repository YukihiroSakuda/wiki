// Environment variable validation and typed access

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",

  // NextAuth
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "local-dev-secret",

  // Azure AD
  AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID ?? "",
  AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET ?? "",
  AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID ?? "",

  // Azure AI Foundry
  AZURE_AI_FOUNDRY_ENDPOINT: process.env.AZURE_AI_FOUNDRY_ENDPOINT ?? "",
  AZURE_AI_FOUNDRY_API_KEY: process.env.AZURE_AI_FOUNDRY_API_KEY ?? "",
  AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT ?? "text-embedding-3-large",

  // Azure AI Search
  AZURE_AI_SEARCH_ENDPOINT: process.env.AZURE_AI_SEARCH_ENDPOINT ?? "",
  AZURE_AI_SEARCH_API_KEY: process.env.AZURE_AI_SEARCH_API_KEY ?? "",
  AZURE_AI_SEARCH_INDEX_NAME: process.env.AZURE_AI_SEARCH_INDEX_NAME ?? "wiki-pages",

  // Azure Blob Storage
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ?? "",
  AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME ?? "wiki-uploads",

  // App
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "Internal Wiki",

  // Helpers
  isAzureAIConfigured: () =>
    !!process.env.AZURE_AI_FOUNDRY_ENDPOINT && !!process.env.AZURE_AI_FOUNDRY_API_KEY,
  isAzureADConfigured: () =>
    !!process.env.AZURE_AD_CLIENT_ID && !!process.env.AZURE_AD_CLIENT_SECRET && !!process.env.AZURE_AD_TENANT_ID,
  isAzureSearchConfigured: () =>
    !!process.env.AZURE_AI_SEARCH_ENDPOINT && !!process.env.AZURE_AI_SEARCH_API_KEY,
  isAzureStorageConfigured: () =>
    !!process.env.AZURE_STORAGE_CONNECTION_STRING,
  isDev: () => process.env.NODE_ENV === "development",
};
