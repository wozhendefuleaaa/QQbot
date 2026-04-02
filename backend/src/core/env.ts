import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * 环境变量加载模块
 * 支持加载多个环境变量文件，按优先级从高到低：
 * 1. .env.local (本地开发覆盖)
 * 2. .env.{NODE_ENV} (特定环境配置)
 * 3. .env (基础配置)
 */
export function loadEnv() {
  const envFiles = [
    // 本地开发覆盖文件
    path.resolve(process.cwd(), '.env.local'),
    // 特定环境配置文件
    process.env.NODE_ENV ? path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}`) : null,
    // 基础配置文件
    path.resolve(process.cwd(), '.env')
  ].filter(Boolean) as string[];

  // 加载所有环境变量文件
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      const result = dotenv.config({ path: envFile });
      if (result.error) {
        console.warn(`加载环境变量文件 ${envFile} 时出错:`, result.error.message);
      } else {
        console.log(`已加载环境变量文件: ${envFile}`);
      }
    }
  });

  // 验证必要的环境变量
  validateRequiredEnvVars();
}

/**
 * 验证必要的环境变量
 */
function validateRequiredEnvVars() {
  const requiredVars = [
    'ADMIN_PASSWORD',
    'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`警告: 缺少以下必要的环境变量: ${missingVars.join(', ')}`);
    console.warn('请在 .env 文件中设置这些变量');
  }
}

/**
 * 获取环境变量，支持默认值
 */
export function getEnv(name: string, defaultValue?: string): string {
  return process.env[name] || defaultValue || '';
}

/**
 * 获取布尔类型的环境变量
 */
export function getEnvBool(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 获取数字类型的环境变量
 */
export function getEnvNumber(name: string, defaultValue: number = 0): number {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 获取数组类型的环境变量（逗号分隔）
 */
export function getEnvArray(name: string, defaultValue: string[] = []): string[] {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return value.split(',').map(item => item.trim()).filter(Boolean);
}
