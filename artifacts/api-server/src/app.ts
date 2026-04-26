import express, { type Request, type Response } from "express";
import { createRequire } from "node:module";
import routes from "./routes";

type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

type PinoHttpFactory = (options?: {
  customLogLevel?: (req: Request, res: Response, err?: Error) => LogLevel;
}) => express.RequestHandler;

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http") as PinoHttpFactory;

const app = express();

app.use(
  pinoHttp({
    customLogLevel: (_req: Request, res: Response, err?: Error) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

app.use(express.json({ limit: "10mb" }));

app.use("/api", routes);

export default app;