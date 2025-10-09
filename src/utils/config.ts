import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { AppConfig } from '../types/config';

/**
 * 加载配置文件
 */
export function loadConfig(configPath: string = 'config.yaml'): AppConfig {
  try {
    const fullPath = path.resolve(process.cwd(), configPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`配置文件不存在: ${fullPath}`);
    }

    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const config = yaml.parse(fileContent) as AppConfig;

    // 验证配置
    validateConfig(config);

    return config;
  } catch (error) {
    console.error('加载配置文件失败:', error);
    throw error;
  }
}

/**
 * 验证配置文件
 */
function validateConfig(config: AppConfig): void {
  if (!config.interval || config.interval <= 0) {
    throw new Error('interval 必须大于 0');
  }

  if (!config.sites || config.sites.length === 0) {
    throw new Error('至少需要配置一个站点');
  }

  for (const site of config.sites) {
    if (!site.name) {
      throw new Error('站点 name 不能为空');
    }
    if (!site.url) {
      throw new Error('站点 URL 不能为空');
    }
    if (!site.url.startsWith('http://') && !site.url.startsWith('https://')) {
      throw new Error(`无效的 URL: ${site.url}`);
    }
  }

  if (config.feishu?.enabled) {
    if (!config.feishu.webhook) {
      throw new Error('启用飞书通知时必须配置 webhook');
    }
    if (!config.feishu.templateId) {
      throw new Error('启用飞书通知时必须配置 templateId');
    }
    if (!config.feishu.templateVersion) {
      throw new Error('启用飞书通知时必须配置 templateVersion');
    }
    if (!config.feishu.origin) {
      throw new Error('启用飞书通知时必须配置 origin');
    }
  }

  if (config.clash?.enabled) {
    if (!config.clash.apiUrl) {
      throw new Error('启用 Clash API 时必须配置 apiUrl');
    }
  }

  if (config.proxy?.enabled) {
    if (!config.proxy.host || !config.proxy.port) {
      throw new Error('启用代理时必须配置 host 和 port');
    }
  }
}

