export class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(
      `[${new Date().toISOString()}] [INFO] [${
        this.context
      }] ${message}`,
      ...args
    );
  }

  warn(message: string, ...args: any[]): void {
    console.warn(
      `[${new Date().toISOString()}] [WARN] [${
        this.context
      }] ${message}`,
      ...args
    );
  }

  error(message: string, ...args: any[]): void {
    console.error(
      `[${new Date().toISOString()}] [ERROR] [${
        this.context
      }] ${message}`,
      ...args
    );
  }

  debug(message: string, ...args: any[]): void {
    console.debug(
      `[${new Date().toISOString()}] [DEBUG] [${
        this.context
      }] ${message}`,
      ...args
    );
  }
}
