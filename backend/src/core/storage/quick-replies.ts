import path from 'path';
import { QuickReply } from '../../types.js';
import { dataDir, readJsonFile, writeJsonFile } from './base.js';

const quickRepliesFilePath = path.join(dataDir, 'quick-replies.json');
export const quickReplies: QuickReply[] = [];

export async function loadQuickRepliesFromDisk() {
  const parsed = await readJsonFile<QuickReply[]>(quickRepliesFilePath);
  if (Array.isArray(parsed)) {
    quickReplies.splice(0, quickReplies.length, ...parsed.filter((x) => x?.id && x?.text));
  }
}

export async function saveQuickRepliesToDisk() {
  await writeJsonFile(quickRepliesFilePath, quickReplies);
}
