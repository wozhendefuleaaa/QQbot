import { existsSync, promises as fs } from 'fs';
import path from 'path';

const configuredDataDir = process.env.BACKEND_DATA_DIR?.trim();
const defaultDataDir = existsSync(path.resolve(process.cwd(), 'backend'))
  ? path.resolve(process.cwd(), 'backend/data')
  : path.resolve(process.cwd(), 'data');
export const dataDir = configuredDataDir ? path.resolve(configuredDataDir) : defaultDataDir;

export async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}
