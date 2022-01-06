import path from 'path';
import { URL } from 'url';
import { createServer } from '@mediamonks/monck';

createServer({
  mockDir: path.resolve(new URL('.', import.meta.url).pathname, './mocks-esm'),
  useUnixSocket: process.env.NODE_ENV === 'production',
});
