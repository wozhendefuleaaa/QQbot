import path from 'path';
import { OpenApiToken } from '../../types.js';
import { dataDir, readJsonFile, writeJsonFile } from './base.js';

const openApiTokensFilePath = path.join(dataDir, 'openapi-tokens.json');
export const openApiTokens: OpenApiToken[] = [];

export async function loadOpenApiTokensFromDisk() {
  const parsed = await readJsonFile<OpenApiToken[]>(openApiTokensFilePath);
  if (Array.isArray(parsed)) {
    openApiTokens.splice(0, openApiTokens.length, ...parsed.filter((x) => x?.id && x?.token));
  }
}

export async function saveOpenApiTokensToDisk() {
  await writeJsonFile(openApiTokensFilePath, openApiTokens);
}
