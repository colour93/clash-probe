import * as cron from 'node-cron';
import { loadConfig } from './utils/config';
import { Logger } from './utils/logger';
import { MonitorService } from './services/monitor';
import { ClashService } from './services/clash';

const logger = new Logger('Main');

/**
 * 主程序入口
 */
async function main() {
  try {
    logger.info('========================================');
    logger.info('Clash 探针启动中...');
    logger.info('========================================');

    // 加载配置
    const configPath = process.env.CONFIG_PATH || 'config.yaml';
    logger.info(`正在加载配置文件: ${configPath}`);
    const config = loadConfig(configPath);

    logger.info(`拨测间隔: ${config.interval} 秒`);
    logger.info(`拨测站点数: ${config.sites.length}`);
    logger.info(`代理设置: ${config.proxy?.enabled ? `已启用 (${config.proxy.protocol}://${config.proxy.host}:${config.proxy.port})` : '未启用'}`);
    logger.info(`Clash API: ${config.clash?.enabled ? `已启用 (${config.clash.apiUrl})` : '未启用'}`);
    logger.info(`飞书通知: ${config.feishu.enabled ? '已启用' : '未启用'}`);
    if (config.feishu.enabled) {
      logger.info(`  - 来源: ${config.feishu.origin}`);
      logger.info(`  - 卡片模板: ${config.feishu.templateId}@${config.feishu.templateVersion}`);
    }
    logger.info(`告警阈值: 连续失败 ${config.feishu.failureThreshold} 次`);

    // 测试 Clash API 连接
    if (config.clash?.enabled) {
      logger.info('');
      logger.info('正在测试 Clash API 连接...');
      const clashService = new ClashService(config.clash);
      await clashService.testConnection();
    }

    // 创建监控服务
    const monitor = new MonitorService(config);

    // 立即执行一次探测
    logger.info('');
    logger.info('执行首次探测...');
    await monitor.runProbe();

    // 设置定时任务
    const cronExpression = `*/${config.interval} * * * * *`;
    logger.info('');
    logger.info(`定时任务已设置: 每 ${config.interval} 秒执行一次探测`);
    logger.info('========================================');
    logger.info('Clash 探针运行中，按 Ctrl+C 停止');
    logger.info('========================================\n');

    cron.schedule(cronExpression, async () => {
      await monitor.runProbe();
    });

    // 优雅退出处理
    process.on('SIGINT', () => {
      logger.info('');
      logger.info('========================================');
      logger.info('收到退出信号，正在停止...');
      logger.info('========================================');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('');
      logger.info('========================================');
      logger.info('收到终止信号，正在停止...');
      logger.info('========================================');
      process.exit(0);
    });
  } catch (error) {
    logger.error('程序启动失败:', error);
    process.exit(1);
  }
}

// 启动程序
main();

