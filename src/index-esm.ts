import type { Express } from 'express';
import { createRequire } from 'module';
import type { RequestHandler } from 'express';
import { getMockMiddleware, MockOptions } from './getMockMiddleware.js';
import { createServer as internalCreateServer, ServerOptions } from './createServer.js';

// TS will only transpile this file in "esm" mode,
// that's why we have to split up the index files and pass the specific require down
const customRequire = createRequire(import.meta.url);

export function createMockMiddleWare(mockDir?: string, options?: MockOptions): RequestHandler {
  return getMockMiddleware(mockDir, options, customRequire);
}
export function createServer(serverOptions: ServerOptions = {}): Express {
  return internalCreateServer(serverOptions, customRequire);
}
