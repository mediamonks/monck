import path from 'path';
import { createServer } from '../src';

createServer({
  mockDir: path.resolve(__dirname, './mocks'),
  useUnixSocket: process.env.NODE_ENV === 'production'
});