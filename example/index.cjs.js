const path = require('path');
const createServer = require('../dist/cjs/').createServer;

createServer({
  mockDir: path.resolve(__dirname, './mocks-cjs'),
  useUnixSocket: process.env.NODE_ENV === 'production',
});
