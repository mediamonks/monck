import path from 'path';
import { URL } from 'url';
import { createServer } from '../src/index';

createServer({
  mockDir: path.resolve(new URL('.', import.meta.url).pathname, './mocks'),
  useUnixSocket: process.env.NODE_ENV === 'production',
});
