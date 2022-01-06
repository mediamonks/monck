import fs from 'fs';
import type { Express, RequestHandler } from 'express';
import express from 'express';
import { resolve } from 'path';
import { getMockMiddleware } from './getMockMiddleware.js';
import type { MockOptions, RequestConfig } from './getMockMiddleware.js';

export type ServerOptions = MockOptions & {
  mountPath?: string;
  useUnixSocket?: boolean;
  socketPath?: string;
  host?: string;
  port?: number;
  mockDir?: string;
};

export const DEFAULT_SERVER_OPTIONS: Required<Omit<ServerOptions, 'ignore'>> = {
  mountPath: '/api',
  host: 'localhost',
  port: 9002,
  useUnixSocket: false,
  socketPath: resolve(process.cwd(), './socket'),
  mockDir: './mocks',
};

export function createServer(serverOptions: ServerOptions = {}): Express {
  const { mockDir, socketPath, useUnixSocket, host, port, ...middlewareOptions } = {
    ...DEFAULT_SERVER_OPTIONS,
    // clear out undefined value to not override the default options
    ...(Object.fromEntries(
      Object.entries(serverOptions).filter(([, v]) => v !== undefined),
    ) as ServerOptions),
  };

  // remove trailing /
  const mountPath = middlewareOptions.mountPath.replace(/\/$/, '');

  const app = express();
  app.use(mountPath, getMockMiddleware(mockDir, { ...middlewareOptions }));

  // return 404 response to unmatched routes under the mount path
  app.use(mountPath, (req, res) => res.sendStatus(404));

  if (useUnixSocket) {
    // clean up previous socket connection
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }

    app.listen(socketPath, () => {
      console.info(`http://unix:${socketPath}`);

      // give nginx permission to use this
      fs.chmodSync(socketPath, 0o666);
    });
  } else {
    app.listen(port, host, () => {
      console.info(`http://${host}:${port}${mountPath || '/'}`);
    });
  }

  return app;
}
