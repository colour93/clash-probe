import axios, { AxiosError, AxiosProxyConfig } from 'axios';
import { ProxyConfig, SiteConfig } from '../types/config';
import { ProbeResult } from '../types/probe';
import { Logger } from '../utils/logger';

const logger = new Logger('Probe');

/**
 * 站点探测服务
 */
export class ProbeService {
  private proxyConfig?: ProxyConfig;

  constructor(proxyConfig?: ProxyConfig) {
    this.proxyConfig = proxyConfig;
  }

  /**
   * 探测单个站点
   */
  async probeSite(site: SiteConfig): Promise<ProbeResult> {
    const startTime = Date.now();
    
    try {
      // 构建 axios 配置
      const axiosConfig: any = {
        timeout: site.timeout,
        validateStatus: () => true, // 接受所有状态码，手动判断
      };

      // 配置代理
      if (this.proxyConfig?.enabled) {
        const proxy: AxiosProxyConfig = {
          host: this.proxyConfig.host,
          port: this.proxyConfig.port,
          protocol: this.proxyConfig.protocol,
        };
        axiosConfig.proxy = proxy;
        logger.info(`使用代理访问: ${site.url} (${this.proxyConfig.protocol}://${this.proxyConfig.host}:${this.proxyConfig.port})`);
      } else {
        // 禁用代理
        axiosConfig.proxy = false;
      }

      // 发起请求
      const response = await axios.get(site.url, axiosConfig);
      const responseTime = Date.now() - startTime;
      const statusCode = response.status;

      const success = statusCode === site.expectedStatus;

      if (success) {
        logger.info(`✓ ${site.url} - 状态码: ${statusCode}, 响应时间: ${responseTime}ms`);
      } else {
        logger.warn(`✗ ${site.url} - 状态码: ${statusCode} (期望: ${site.expectedStatus}), 响应时间: ${responseTime}ms`);
      }

      return {
        name: site.name,
        url: site.url,
        success,
        statusCode,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;
      
      let errorMessage = '未知错误';
      if (axiosError.code === 'ECONNABORTED') {
        errorMessage = '请求超时';
      } else if (axiosError.code === 'ECONNREFUSED') {
        errorMessage = '连接被拒绝';
      } else if (axiosError.code === 'ENOTFOUND') {
        errorMessage = '域名解析失败';
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }

      logger.error(`✗ ${site.url} - 错误: ${errorMessage}, 耗时: ${responseTime}ms`);

      return {
        name: site.name,
        url: site.url,
        success: false,
        responseTime,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 探测所有站点
   */
  async probeAllSites(sites: SiteConfig[]): Promise<ProbeResult[]> {
    logger.info(`开始探测 ${sites.length} 个站点...`);
    
    const results = await Promise.all(
      sites.map(site => this.probeSite(site))
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info(`探测完成 - 成功: ${successCount}, 失败: ${failureCount}`);

    return results;
  }
}

