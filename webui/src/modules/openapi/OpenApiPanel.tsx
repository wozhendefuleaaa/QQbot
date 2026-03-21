import { useState } from 'react';
import { OpenApiTokenView } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// API 文档数据
const API_DOCS = [
  {
    method: 'GET',
    path: '/api/external/status',
    description: '获取机器人连接状态',
    params: [],
    response: `{ "connected": boolean, "accountId": string | null, "accountName": string | null }`
  },
  {
    method: 'POST',
    path: '/api/external/connect',
    description: '连接机器人账号',
    params: [{ name: 'accountId', type: 'string', required: true, desc: '账号ID' }],
    response: `{ "ok": boolean, "message": string }`
  },
  {
    method: 'POST',
    path: '/api/external/disconnect',
    description: '断开机器人连接',
    params: [],
    response: `{ "ok": boolean, "message": string }`
  },
  {
    method: 'POST',
    path: '/api/external/send',
    description: '发送消息',
    params: [
      { name: 'targetId', type: 'string', required: true, desc: '目标ID（群号或用户ID）' },
      { name: 'targetType', type: 'string', required: true, desc: '目标类型：user 或 group' },
      { name: 'message', type: 'string', required: true, desc: '消息内容' },
      { name: 'msgId', type: 'string', required: false, desc: '消息ID（可选）' }
    ],
    response: `{ "ok": boolean, "timestamp": string }`
  },
  {
    method: 'GET',
    path: '/api/external/conversations',
    description: '获取会话列表',
    params: [
      { name: 'limit', type: 'number', required: false, desc: '返回数量限制' },
      { name: 'offset', type: 'number', required: false, desc: '偏移量' }
    ],
    response: `{ "total": number, "items": Conversation[] }`
  },
  {
    method: 'GET',
    path: '/api/external/conversations/:id/messages',
    description: '获取会话消息',
    params: [
      { name: 'limit', type: 'number', required: false, desc: '返回数量限制' },
      { name: 'before', type: 'string', required: false, desc: '时间戳，获取此时间之前的消息' }
    ],
    response: `{ "conversationId": string, "total": number, "items": Message[] }`
  },
  {
    method: 'GET',
    path: '/api/external/accounts',
    description: '获取账号列表',
    params: [],
    response: `{ "items": Account[] }`
  },
  {
    method: 'GET',
    path: '/api/external/logs',
    description: '获取平台日志',
    params: [{ name: 'limit', type: 'number', required: false, desc: '返回数量限制' }],
    response: `{ "items": Log[] }`
  },
  {
    method: 'GET',
    path: '/api/external/statistics',
    description: '获取统计信息',
    params: [],
    response: `{ "messages": object, "conversations": object }`
  }
];

// 代码示例
const CODE_EXAMPLES = {
  curl: (token: string) => `# 获取机器人状态
curl -X GET "http://localhost:3000/api/external/status" \\
  -H "Authorization: Bearer ${token || 'YOUR_TOKEN'}"

# 发送消息到群
curl -X POST "http://localhost:3000/api/external/send" \\
  -H "Authorization: Bearer ${token || 'YOUR_TOKEN'}" \\
  -H "Content-Type: application/json" \\
  -d '{"targetId": "群号", "targetType": "group", "message": "Hello!"}'

# 发送私聊消息
curl -X POST "http://localhost:3000/api/external/send" \\
  -H "Authorization: Bearer ${token || 'YOUR_TOKEN'}" \\
  -H "Content-Type: application/json" \\
  -d '{"targetId": "用户ID", "targetType": "user", "message": "Hello!"}'`,
  
  javascript: (token: string) => `// 使用 fetch API
const token = '${token || 'YOUR_TOKEN'}';
const baseUrl = 'http://localhost:3000';

// 获取机器人状态
async function getStatus() {
  const res = await fetch(\`\${baseUrl}/api/external/status\`, {
    headers: { 'Authorization': \`Bearer \${token}\` }
  });
  return res.json();
}

// 发送消息
async function sendMessage(targetId, targetType, message) {
  const res = await fetch(\`\${baseUrl}/api/external/send\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ targetId, targetType, message })
  });
  return res.json();
}

// 使用示例
getStatus().then(console.log);
sendMessage('群号', 'group', 'Hello!').then(console.log);`,

  python: (token: string) => `import requests

token = '${token || 'YOUR_TOKEN'}'
base_url = 'http://localhost:3000'
headers = {'Authorization': f'Bearer {token}'}

# 获取机器人状态
def get_status():
    res = requests.get(f'{base_url}/api/external/status', headers=headers)
    return res.json()

# 发送消息
def send_message(target_id, target_type, message):
    data = {
        'targetId': target_id,
        'targetType': target_type,
        'message': message
    }
    res = requests.post(f'{base_url}/api/external/send', 
                        headers={**headers, 'Content-Type': 'application/json'}, 
                        json=data)
    return res.json()

# 使用示例
print(get_status())
print(send_message('群号', 'group', 'Hello!'))`
};

type Props = {
  enabled: boolean;
  tokens: OpenApiTokenView[];
  newTokenName: string;
  onTokenNameChange: (name: string) => void;
  onCreateToken: () => void;
  onToggleToken: (id: string) => void;
  onDeleteToken: (id: string) => void;
  onRefresh: () => void;
};

type TabKey = 'tokens' | 'docs' | 'examples';

export function OpenApiPanel({
  enabled,
  tokens,
  newTokenName,
  onTokenNameChange,
  onCreateToken,
  onToggleToken,
  onDeleteToken,
  onRefresh
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('tokens');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [exampleLang, setExampleLang] = useState<'curl' | 'javascript' | 'python'>('curl');

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleCreateAndCopy = () => {
    // 创建后需要显示完整 token 供复制
    onCreateToken();
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500';
      case 'POST': return 'bg-blue-500';
      case 'PUT': return 'bg-yellow-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* 标签页导航 */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'tokens'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('tokens')}
        >
          Token 管理
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'docs'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('docs')}
        >
          API 文档
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'examples'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('examples')}
        >
          使用示例
        </button>
      </div>

      {/* Token 管理标签页 */}
      {activeTab === 'tokens' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>开放 API</CardTitle>
              <CardDescription>
                管理 OpenAPI Token，用于第三方系统集成
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">OpenAPI 状态：</span>
                <Badge variant={enabled ? 'success' : 'secondary'}>
                  {enabled ? '启用' : '禁用'}
                </Badge>
              </div>

              <div className="flex gap-3">
                <Input
                  value={newTokenName}
                  onChange={(e) => onTokenNameChange(e.target.value)}
                  placeholder="Token 名称（如：自动化脚本）"
                  className="max-w-xs"
                />
                <Button onClick={handleCreateAndCopy} disabled={!enabled}>
                  新建 Token
                </Button>
                <Button variant="outline" onClick={onRefresh}>
                  刷新
                </Button>
              </div>

              {!enabled && (
                <p className="text-sm text-muted-foreground">
                  OpenAPI 已禁用，请在配置中启用后再创建 Token
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token 列表</CardTitle>
              <CardDescription>管理已创建的 API Token（创建后请立即复制，完整 Token 仅显示一次）</CardDescription>
            </CardHeader>
            <CardContent>
              {tokens.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">暂无 Token，请创建一个新 Token</p>
              ) : (
                <div className="space-y-3">
                  {tokens.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t.name}</span>
                            <Badge variant={t.enabled ? 'success' : 'secondary'}>
                              {t.enabled ? '启用' : '禁用'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {t.tokenMasked}
                            </code>
                            <span className="text-xs text-muted-foreground">
                              创建于 {new Date(t.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(t.tokenMasked, `mask-${t.id}`)}
                        >
                          {copiedId === `mask-${t.id}` ? '已复制' : '复制'}
                        </Button>
                        <Button
                          variant={t.enabled ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => onToggleToken(t.id)}
                        >
                          {t.enabled ? '停用' : '启用'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmId(t.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* API 文档标签页 */}
      {activeTab === 'docs' && (
        <Card>
          <CardHeader>
            <CardTitle>API 文档</CardTitle>
            <CardDescription>
              所有 API 请求需要在 Header 中携带 Authorization: Bearer {'<token>'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {API_DOCS.map((api, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`${getMethodColor(api.method)} text-white text-xs font-bold px-2 py-1 rounded`}>
                    {api.method}
                  </span>
                  <code className="text-sm font-mono">{api.path}</code>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{api.description}</p>
                
                {api.params.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-2">参数：</p>
                    <div className="bg-muted rounded p-3 text-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left">
                            <th className="pr-4">参数名</th>
                            <th className="pr-4">类型</th>
                            <th className="pr-4">必填</th>
                            <th>说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {api.params.map((param, pIndex) => (
                            <tr key={pIndex}>
                              <td className="pr-4 font-mono">{param.name}</td>
                              <td className="pr-4">{param.type}</td>
                              <td className="pr-4">{param.required ? '是' : '否'}</td>
                              <td className="text-muted-foreground">{param.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">响应示例：</p>
                  <pre className="bg-muted rounded p-3 text-sm overflow-x-auto">{api.response}</pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 使用示例标签页 */}
      {activeTab === 'examples' && (
        <Card>
          <CardHeader>
            <CardTitle>使用示例</CardTitle>
            <CardDescription>
              选择语言查看调用示例代码
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={exampleLang === 'curl' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExampleLang('curl')}
              >
                cURL
              </Button>
              <Button
                variant={exampleLang === 'javascript' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExampleLang('javascript')}
              >
                JavaScript
              </Button>
              <Button
                variant={exampleLang === 'python' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExampleLang('python')}
              >
                Python
              </Button>
            </div>

            <div className="relative">
              <pre className="bg-muted rounded p-4 text-sm overflow-x-auto whitespace-pre-wrap">
                {CODE_EXAMPLES[exampleLang](tokens.find(t => t.enabled)?.tokenMasked || '')}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(CODE_EXAMPLES[exampleLang](''), exampleLang)}
              >
                {copiedId === exampleLang ? '已复制' : '复制代码'}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">⚠️ 安全提示</h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Token 仅在创建时显示一次完整值，请妥善保存</li>
                <li>• 不要在前端代码中暴露 Token</li>
                <li>• 定期轮换 Token 以提高安全性</li>
                <li>• 如果 Token 泄露，请立即删除并创建新 Token</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此 Token 吗？删除后使用该 Token 的应用将无法继续访问 API。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteToken(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
