import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wawa-QQbot API',
      version: '0.1.0',
      description: 'QQ 机器人管理平台 API 文档',
    },
    servers: [{ url: '/api', description: 'Local server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        openApiToken: { type: 'http', scheme: 'bearer', bearerFormat: 'openapi_token' },
      },
    },
    tags: [
      { name: 'Auth', description: '认证接口' },
      { name: 'Accounts', description: '账号管理' },
      { name: 'Chat', description: '聊天消息' },
      { name: 'Platform', description: '平台连接' },
      { name: 'External', description: '开放 API' },
    ],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: '用户登录',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'JWT token + 用户信息' },
            '401': { description: '认证失败' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: '当前用户信息',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: '用户信息' } },
        },
      },
      '/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: '修改密码',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    oldPassword: { type: 'string' },
                    newPassword: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: '修改成功' } },
        },
      },
      '/accounts': {
        get: {
          tags: ['Accounts'],
          summary: '账号列表',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: '账号列表' } },
        },
        post: {
          tags: ['Accounts'],
          summary: '创建账号',
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: '创建成功' } },
        },
      },
      '/accounts/{id}/{action}': {
        post: {
          tags: ['Accounts'],
          summary: '启停账号',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'action', in: 'path', required: true, schema: { type: 'string', enum: ['start', 'stop'] } },
          ],
          responses: { '200': { description: '操作成功' } },
        },
      },
      '/platform/status': {
        get: {
          tags: ['Platform'],
          summary: '平台状态',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: '平台连接状态' } },
        },
      },
      '/platform/connect': {
        post: {
          tags: ['Platform'],
          summary: '连接平台',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: '连接已发起' } },
        },
      },
      '/platform/disconnect': {
        post: {
          tags: ['Platform'],
          summary: '断开连接',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: '已断开' } },
        },
      },
      '/messages/send': {
        post: {
          tags: ['Chat'],
          summary: '发送消息',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: '消息已发送' } },
        },
      },
      '/external/status': {
        get: {
          tags: ['External'],
          summary: '机器人状态 (OpenAPI)',
          security: [{ openApiToken: [] }],
          responses: { '200': { description: '机器人状态' } },
        },
      },
      '/external/send': {
        post: {
          tags: ['External'],
          summary: '发送消息 (OpenAPI)',
          security: [{ openApiToken: [] }],
          responses: { '200': { description: '消息已发送' }, '503': { description: '机器人未连接' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);