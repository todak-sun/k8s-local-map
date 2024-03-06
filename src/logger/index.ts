const chalk = require("chalk");

type LoggerProps = {
  message?: string;
  options?: any;
  context?: string;
};

export class Logger {
  constructor(private readonly context?: string) {}
  debug = ({ options, message, context }: LoggerProps) => {
    console.log(chalk.cyan(`[DEBUG][${this.context || context}] - ${message || ""} ${options ? `${options}` : ""}`));
  };
  error = ({ options, message, context }: LoggerProps) => {
    console.log(chalk.red(`[ERROR][${this.context || context}] - ${message || ""} ${options ? `${options}` : ""}`));
  };
}

export const createLogger = (context: string): Logger => new Logger(context);
