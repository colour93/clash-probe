import axios from 'axios';
import { ClashConfig } from '../types/config';
import { Logger } from '../utils/logger';

const logger = new Logger('Clash');

/**
 * Clash API 服务
 */
export class ClashService {
  private config?: ClashConfig;

  constructor(config?: ClashConfig) {
    this.config = config;
  }

  /**
   * 获取当前节点名称
   */
  async getCurrentProxy(): Promise<string> {
    if (!this.config?.enabled) {
      return '未知';
    }

    try {
      const headers: any = {};
      if (this.config.secret) {
        headers['Authorization'] = `Bearer ${this.config.secret}`;
      }

      // 获取代理选择器信息
      const response = await axios.get(`${this.config.apiUrl}/proxies`, {
        headers,
        timeout: 5000,
      });

      // 尝试从 GLOBAL 或其他选择器中获取当前代理
      const proxies = response.data.proxies;

      const nameRegex = /国外流量|节点选择|proxy/gi

      // 优先尝试其他常见的选择器名称
      for (const name of Object.keys(proxies)) {
        if (nameRegex.test(name.toLowerCase())) {
          if (proxies[name]?.now) {
            return proxies[name].now;
          }
        }
      }

      // 然后尝试 GLOBAL
      if (proxies.GLOBAL?.now) {
        return proxies.GLOBAL.now;
      }

      // 如果找不到，返回第一个有 now 属性的选择器
      for (const [key, value] of Object.entries(proxies)) {
        if ((value as any).now) {
          return (value as any).now;
        }
      }

      return '未知';
    } catch (error: any) {
      logger.error('获取 Clash 当前节点失败:', error.message);
      return '未知';
    }
  }

  /**
   * 测试 Clash API 连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.config?.enabled) {
      return false;
    }

    try {
      const headers: any = {};
      if (this.config.secret) {
        headers['Authorization'] = `Bearer ${this.config.secret}`;
      }

      await axios.get(`${this.config.apiUrl}/version`, {
        headers,
        timeout: 5000,
      });

      logger.info('✓ Clash API 连接成功');
      return true;
    } catch (error: any) {
      logger.error('✗ Clash API 连接失败:', error.message);
      return false;
    }
  }
}

