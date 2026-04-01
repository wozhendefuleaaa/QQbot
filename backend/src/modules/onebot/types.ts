import WebSocket from 'ws';

export type OneBotPlatformType = 'qq_official' | 'onebot_v11';

export type OneBotTokenRecord = {
  id: string;
  name: string;
  accountId: string;
  tokenHash: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OneBotConnectionInfo = {
  connectionId: string;
  accountId: string;
  accountName: string;
  selfId: string | null;
  tokenId: string;
  remoteAddress: string | null;
  userAgent: string | null;
  connectedAt: string;
  lastSeenAt: string;
  lastHeartbeatAt: string | null;
};

export type OneBotActionResponse = {
  status: 'ok' | 'failed';
  retcode: number;
  data: unknown;
  echo: string | null;
  msg?: string;
  wording?: string;
};

export type OneBotActionRequest = {
  action: string;
  params?: Record<string, unknown>;
  echo: string;
};

export type OneBotWsEnvelope = Partial<OneBotActionResponse> & {
  post_type?: string;
  meta_event_type?: string;
  message_type?: 'private' | 'group';
};

export type OneBotPendingAction = {
  resolve: (value: OneBotActionResponse) => void;
  timer: NodeJS.Timeout;
};

export type OneBotRuntimeConnection = OneBotConnectionInfo & {
  socket: WebSocket;
  pendingActions: Map<string, OneBotPendingAction>;
};

export type OneBotStatusOverview = {
  enabledAccounts: number;
  onlineAccounts: number;
  totalConnections: number;
  lastEventAt: string | null;
  totalTokens: number;
  activeTokens: number;
};

export type OneBotAuthResult = {
  ok: true;
  token: OneBotTokenRecord;
  accountId: string;
} | {
  ok: false;
  status: 401 | 403 | 404;
  error: string;
};
