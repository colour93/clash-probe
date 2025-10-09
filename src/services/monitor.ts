import { AppConfig } from '../types/config';
import { ProbeResult, SiteStatus } from '../types/probe';
import { ProbeService } from './probe';
import { FeishuService } from './feishu';
import { ClashService } from './clash';
import { Logger } from '../utils/logger';

const logger = new Logger('Monitor');

/**
 * 监控服务
 */
export class MonitorService {
  private config: AppConfig;
  private probeService: ProbeService;
  private feishuService: FeishuService;
  private clashService: ClashService;
  private siteStatusMap: Map<string, SiteStatus>;

  constructor(config: AppConfig) {
    this.config = config;
    this.probeService = new ProbeService(config.proxy);
    this.feishuService = new FeishuService(config.feishu);
    this.clashService = new ClashService(config.clash);
    this.siteStatusMap = new Map();

    // 初始化站点状态
    for (const site of config.sites) {
      this.siteStatusMap.set(site.url, {
        url: site.url,
        consecutiveFailures: 0,
        notificationSent: false,
      });
    }
  }

  /**
   * 执行一次探测
   */
  async runProbe(): Promise<void> {
    logger.info('========================================');
    logger.info('开始新一轮探测');
    logger.info('========================================');

    try {
      // 探测所有站点
      const results = await this.probeService.probeAllSites(this.config.sites);

      // 处理探测结果
      await this.handleProbeResults(results);

      logger.info('========================================');
      logger.info('本轮探测完成');
      logger.info('========================================\n');
    } catch (error) {
      logger.error('探测过程中出现异常:', error);
    }
  }

  /**
   * 处理探测结果
   */
  private async handleProbeResults(results: ProbeResult[]): Promise<void> {
    // 获取当前 Clash 节点信息
    const currentProxy = await this.clashService.getCurrentProxy();

    logger.debug(currentProxy)
    
    for (const result of results) {
      const status = this.siteStatusMap.get(result.url);
      if (!status) {
        continue;
      }

      if (result.success) {
        // 成功：检查是否需要发送恢复通知
        if (status.consecutiveFailures >= this.config.feishu.failureThreshold && status.notificationSent) {
          logger.info(`站点 ${result.name} 已恢复，发送恢复通知`);
          await this.feishuService.sendSiteRecoveryNotification(
            result.name,
            result.url,
            currentProxy
          );
        }

        // 重置失败计数
        status.consecutiveFailures = 0;
        status.lastSuccessTime = result.timestamp;
        status.notificationSent = false;
      } else {
        // 失败：增加失败计数
        status.consecutiveFailures++;
        status.lastFailureTime = result.timestamp;

        logger.warn(`站点 ${result.name} 连续失败 ${status.consecutiveFailures} 次`);

        // 检查是否达到告警阈值
        if (
          status.consecutiveFailures >= this.config.feishu.failureThreshold &&
          !status.notificationSent
        ) {
          logger.warn(`站点 ${result.name} 达到告警阈值，发送告警通知`);
          const errorMessage = result.error || `状态码异常: ${result.statusCode}`;
          const sent = await this.feishuService.sendSiteFailureNotification(
            result.name,
            result.url,
            status.consecutiveFailures,
            errorMessage,
            currentProxy
          );

          if (sent) {
            status.notificationSent = true;
          }
        }
      }

      // 更新状态
      this.siteStatusMap.set(result.url, status);
    }

    // 输出当前状态统计
    this.logStatusSummary();
  }

  /**
   * 输出状态摘要
   */
  private logStatusSummary(): void {
    const statuses = Array.from(this.siteStatusMap.values());
    const totalSites = statuses.length;
    const failingSites = statuses.filter(s => s.consecutiveFailures > 0).length;
    const alertingSites = statuses.filter(
      s => s.consecutiveFailures >= this.config.feishu.failureThreshold
    ).length;

    logger.info('');
    logger.info('--- 状态摘要 ---');
    logger.info(`总站点数: ${totalSites}`);
    logger.info(`正常站点: ${totalSites - failingSites}`);
    logger.info(`异常站点: ${failingSites}`);
    logger.info(`告警站点: ${alertingSites}`);
    logger.info('----------------');

    if (failingSites > 0) {
      logger.info('');
      logger.info('异常站点详情:');
      statuses
        .filter(s => s.consecutiveFailures > 0)
        .forEach(s => {
          const alert = s.consecutiveFailures >= this.config.feishu.failureThreshold ? '[已告警]' : '';
          logger.info(`  - ${s.url}: 连续失败 ${s.consecutiveFailures} 次 ${alert}`);
        });
    }
  }

  /**
   * 获取站点状态
   */
  getSiteStatus(url: string): SiteStatus | undefined {
    return this.siteStatusMap.get(url);
  }

  /**
   * 获取所有站点状态
   */
  getAllSiteStatuses(): SiteStatus[] {
    return Array.from(this.siteStatusMap.values());
  }
}

