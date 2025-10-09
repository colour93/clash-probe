/**
 * 探测结果
 */
export interface ProbeResult {
  name: string;
  url: string;
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

/**
 * 站点状态
 */
export interface SiteStatus {
  url: string;
  consecutiveFailures: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  notificationSent: boolean;
}

