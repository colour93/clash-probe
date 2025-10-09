import axios from 'axios';
import { FeishuConfig } from '../types/config';
import { ProbeResult } from '../types/probe';
import { Logger } from '../utils/logger';

const logger = new Logger('Feishu');

/**
 * 飞书通知服务
 */
export class FeishuService {
  private config: FeishuConfig;

  constructor(config: FeishuConfig) {
    this.config = config;
  }

  /**
   * 发送卡片通知
   */
  private async sendCardNotification(
    resultStatus: '失败' | '恢复',
    resultTheme: 'red' | 'green',
    site: string,
    siteName: string,
    error: string,
    proxy: string
  ): Promise<boolean> {
    if (!this.config.enabled) {
      logger.info('飞书通知未启用，跳过发送');
      return false;
    }

    try {
      const timestamp = new Date().toLocaleString('zh-CN', { 
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '/');

      const payload = {
        msg_type: 'interactive',
        card: {
          type: 'template',
          data: {
            template_id: this.config.templateId,
            template_version_name: this.config.templateVersion,
            template_variable: {
              result_status: resultStatus,
              result_theme: resultTheme,
              site: site,
              site_name: siteName,
              error: error,
              proxy: proxy,
              origin: this.config.origin,
              time: timestamp,
            },
          },
        },
      };

      logger.info(`正在发送飞书卡片通知: ${siteName} - ${resultStatus}`);
      const response = await axios.post(this.config.webhook, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data.code === 0) {
        logger.info('✓ 飞书卡片通知发送成功');
        return true;
      } else {
        logger.error('✗ 飞书卡片通知发送失败:', response.data);
        return false;
      }
    } catch (error) {
      logger.error('✗ 飞书卡片通知发送异常:', error);
      return false;
    }
  }

  /**
   * 发送站点失败通知
   */
  async sendSiteFailureNotification(
    siteName: string,
    url: string,
    consecutiveFailures: number,
    lastError: string,
    proxy: string
  ): Promise<boolean> {
    const error = lastError || `连续失败 ${consecutiveFailures} 次`;
    return await this.sendCardNotification(
      '失败',
      'red',
      url,
      siteName,
      error,
      proxy
    );
  }

  /**
   * 发送站点恢复通知
   */
  async sendSiteRecoveryNotification(
    siteName: string,
    url: string,
    proxy: string
  ): Promise<boolean> {
    return await this.sendCardNotification(
      '恢复',
      'green',
      url,
      siteName,
      '已恢复正常',
      proxy
    );
  }
}

