/**
 * 代理配置
 */
export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  protocol: 'http' | 'https';
}

/**
 * 站点配置
 */
export interface SiteConfig {
  name: string;
  url: string;
  timeout: number;
  expectedStatus: number;
}

/**
 * 飞书配置
 */
export interface FeishuConfig {
  enabled: boolean;
  webhook: string;
  failureThreshold: number;
  // 卡片模板配置
  templateId: string;
  templateVersion: string;
  // 来源标识
  origin: string;
}

/**
 * Clash API 配置
 */
export interface ClashConfig {
  enabled: boolean;
  apiUrl: string;
  secret?: string;
}

/**
 * 应用配置
 */
export interface AppConfig {
  interval: number;
  proxy?: ProxyConfig;
  clash?: ClashConfig;
  sites: SiteConfig[];
  feishu: FeishuConfig;
}

