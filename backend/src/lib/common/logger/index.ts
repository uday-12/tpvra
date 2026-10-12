import pino, { Logger, LogFn } from "pino";

export const loggerConfig = {
  level: "trace",
  // Enable colored, pretty logs in your console:
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true, // Make logs colorful
      singleLine: true, // Optional: multi-line for easier reading
      translateTime: true, // Add readable timestamps
      ignore: "pid,hostname", // Hide fields you don’t want
    },
  },
};

interface ConsoleStyleLogger {
  trace: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  fatal: (...args: any[]) => void;
  child: (bindings: pino.Bindings) => ConsoleStyleLogger;
  _pino: Logger;
}

type PinoLogMethod = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

function createConsoleStyleLogger(pinoLogger: Logger): ConsoleStyleLogger {
  const methods: readonly PinoLogMethod[] = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ] as const;

  const wrapper: Partial<ConsoleStyleLogger> = {};

  // Wrap log methods
  methods.forEach((method: PinoLogMethod) => {
    const originalMethod: LogFn = pinoLogger[method].bind(pinoLogger);

    wrapper[method] = (...args: any[]): void => {
      if (args.length === 0) {
        originalMethod("");
        return;
      }

      if (args.length === 1) {
        originalMethod(args[0]);
        return;
      }

      const message: string = args
        .map((arg: any) => {
          if (typeof arg === "object" && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch {
              return "[Object object]";
            }
          }
          return String(arg);
        })
        .join(" ");

      originalMethod({ args }, message);
    };
  });

  // Wrap child method to return console-style children
  wrapper.child = (bindings: pino.Bindings): ConsoleStyleLogger => {
    const childLogger = pinoLogger.child(bindings);
    return createConsoleStyleLogger(childLogger);
  };

  wrapper._pino = pinoLogger;
  return wrapper as ConsoleStyleLogger;
}

// Enhanced patching version that also wraps child
function patchPinoLogger<T extends Logger>(
  pinoLogger: T,
): T & ConsoleStyleLogger {
  const methods: readonly PinoLogMethod[] = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ] as const;

  // Patch log methods
  methods.forEach((method: PinoLogMethod) => {
    const original: LogFn = pinoLogger[method].bind(pinoLogger);

    (pinoLogger as any)[method] = (...args: any[]): void => {
      if (args.length <= 1) {
        original(args[0] || "");
        return;
      }

      const message: string = args
        .map((arg: any) =>
          typeof arg === "object" && arg !== null
            ? JSON.stringify(arg, null, 0)
            : String(arg),
        )
        .join(" ");

      original({ multipleArgs: args }, message);
    };
  });

  // Patch child method
  const originalChild = pinoLogger.child.bind(pinoLogger);
  (pinoLogger as any).child = (bindings: pino.Bindings) => {
    const childLogger = originalChild(bindings);
    return patchPinoLogger(childLogger);
  };

  return pinoLogger as T & ConsoleStyleLogger;
}

// Generic factory with child support
function makeConsoleStyle<T extends Logger>(logger: T): T & ConsoleStyleLogger {
  return patchPinoLogger(logger);
}

export const logger = makeConsoleStyle(pino(loggerConfig));
