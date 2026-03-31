import path from 'path';
import { Conversation, Message } from '../../types.js';
import { dataDir, readJsonFile, writeJsonFile } from './base.js';
import { addPlatformLog } from '../logs.js';

const conversationsFilePath = path.join(dataDir, 'conversations.json');
const messagesFilePath = path.join(dataDir, 'messages.json');
export const conversations: Conversation[] = [];
export const messages: Message[] = [];

let chatPersistTimer: NodeJS.Timeout | null = null;

export async function loadChatDataFromDisk() {
  try {
    const parsedConversations = await readJsonFile<Conversation[]>(conversationsFilePath);
    if (Array.isArray(parsedConversations)) {
      conversations.splice(
        0,
        conversations.length,
        ...parsedConversations.filter((x) => x?.id && x?.accountId && x?.peerId)
      );
    }

    const parsedMessages = await readJsonFile<Message[]>(messagesFilePath);
    if (Array.isArray(parsedMessages)) {
      messages.splice(
        0,
        messages.length,
        ...parsedMessages.filter((x) => x?.id && x?.accountId && x?.conversationId)
      );
    }

    addPlatformLog('INFO', `已加载聊天存储：会话 ${conversations.length} 条，消息 ${messages.length} 条`);
  } catch (error) {
    const e = error as Error;
    addPlatformLog('WARN', `加载聊天存储失败：${e.message}`);
  }
}

export async function saveChatDataToDisk() {
  await writeJsonFile(conversationsFilePath, conversations);
  await writeJsonFile(messagesFilePath, messages);
}

export async function flushSaveChatDataToDisk() {
  if (chatPersistTimer) {
    clearTimeout(chatPersistTimer);
    chatPersistTimer = null;
  }

  try {
    await saveChatDataToDisk();
  } catch (error) {
    const e = error as Error;
    addPlatformLog('WARN', `保存聊天存储失败：${e.message}`);
  }
}

export function scheduleSaveChatDataToDisk() {
  if (chatPersistTimer) return;

  chatPersistTimer = setTimeout(() => {
    void flushSaveChatDataToDisk();
  }, 200);
}
