export const qqApiBase = process.env.QQ_API_BASE || 'https://bots.qq.com';
export const qqGatewayUrlFromEnv = process.env.QQ_GATEWAY_URL || '';
export const qqGatewayApiBase = process.env.QQ_GATEWAY_API_BASE || 'https://api.sgroup.qq.com';
export const qqAuthPrefix = process.env.QQ_AUTH_PREFIX || 'QQBot';
export const qqMessageApiTemplate = process.env.QQ_MESSAGE_API_TEMPLATE || '';

export const gatewayIntents = Number(process.env.QQ_GATEWAY_INTENTS || 0);
if (!Number.isFinite(gatewayIntents) || gatewayIntents < 0) {
  throw new Error('QQ_GATEWAY_INTENTS 配置无效，必须是非负数字');
}
