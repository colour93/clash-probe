/**
 * 简单的日志工具
 */
export class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}]` : '';
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} ${this.prefix} ${message}`;
  }

  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage(message), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage(message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage(message), ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(this.formatMessage(message), ...args);
  }
}

