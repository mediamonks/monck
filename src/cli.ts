import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createServer } from './createServer.js';

yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .command<{
    mountPath: string;
    host: string;
    port: number;
    unixSocket: boolean;
    socketPath: string;
    mockDir: string;
    ignore: string;
  }>(
    ['$0', 'server'],
    'Start a monck server',
    () => {},
    (argv) => {
      createServer({
        ...argv,
        useUnixSocket: argv.unixSocket,
      });
    },
  )
  .example('$0', 'Start a server on default host and port.')
  .example('$0 -h localhost -p 9002', 'Start a server on a specific host and port')
  .example('$0 -u -s ./monck-socket', 'Start a server connected to the socket at that location')
  .example('$0 -m api', 'Make all mock routes available on the "api/" path.')
  .example('$0 -d ./mocks', 'Specify a folder where the mock files are located.')
  .example('$0 -i "*.sample.js"', 'Ignore sample files in the mock folder.')
  .option('m', {
    alias: 'mount-path',
    default: '',
    describe:
      'On what path the mock API should be mounted. All configured mock endpoints will be prefixed by this path',
    type: 'string',
    nargs: 1,
  })
  .option('h', {
    alias: 'host',
    default: undefined,
    describe: 'The host that will be used to run the server, passed to `app.listen`',
    type: 'string',
    nargs: 1,
  })
  .option('p', {
    alias: 'port',
    default: undefined,
    describe: 'The port that will be used to run the server, passed to `app.listen`',
    type: 'number',
    nargs: 1,
  })
  .option('u', {
    alias: 'unix-socket',
    default: undefined,
    describe:
      'Whether to use a unix socket to start the server instead of the default `host:port`.',
    type: 'boolean',
    conflicts: ['host', 'port'],
  })
  .option('s', {
    alias: 'socket-path',
    default: undefined,
    describe: 'Where to create the unix socket. Only needed when `unix-socket` is true.',
    type: 'string',
    nargs: 1,
    implies: 'unix-socket',
  })
  .option('d', {
    alias: 'mock-dir',
    default: undefined,
    describe: 'Where the mock config files can be found',
    type: 'string',
    nargs: 1,
  })
  .option('i', {
    alias: 'ignore',
    default: undefined,
    describe:
      'Add a glob pattern to exclude matches. Note: ignore patterns are always in `dot:true` mode, regardless of any other settings',
    type: 'string',
    nargs: 1,
  })
  .group(['mount-path', 'host', 'port', 'unix-socket', 'socket-path'], 'Server:')
  .group(['mock-dir', 'ignore'], 'Middleware:')
  .help()
  .epilogue(
    'for more information about the parameters, please visit https://github.com/mediamonks/monck',
  )
  .version(false)
  .wrap(Math.min(120, yargs(hideBin(process.argv)).terminalWidth()))
  .parse();
