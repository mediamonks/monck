import fs from 'fs';
import type { Express, RequestHandler } from 'express'
import express from 'express'
import { resolve } from 'path';
import getMockMiddleware from './createMockMiddleware';
// @ts-ignore
import type { MockOptions } from './createMockMiddleware';

export type { RequestConfig} from './createMockMiddleware'

export type ServerOptions = MockOptions & {
  mountPath?: string,
  useUnixSocket?: boolean;
  socketPath?: string;
  host?: string,
  port?: number,
  mockDir?: string,
}

const DEFAULT_SERVER_OPTIONS: Required<Omit<ServerOptions, 'mockDir' | keyof MockOptions>> = {
  mountPath: '/api/',
  host: 'localhost',
  port: 9002,
  useUnixSocket: false,
  socketPath: resolve(process.cwd(), './socket'),
}

export function createServer(serverOptions: ServerOptions = {}): Express {
  const { mountPath, mockDir, socketPath, useUnixSocket, host, port, ...options } = {...DEFAULT_SERVER_OPTIONS, ...serverOptions};

  const app = express();
  app.use(mountPath, createMockMiddleWare(mockDir, options));

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
      console.info(`http://${host}:${port}`);
    });
  }

  return app;
}

export function createMockMiddleWare(mockDir?: string, options?: MockOptions): RequestHandler {
  return getMockMiddleware(mockDir, options);
}