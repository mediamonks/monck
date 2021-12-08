# @mediamonks/monck

Add highly configurable API mocks to your express server

## Status

This is the first iteration of this module, inspired by
[express-mock-api-middleware](https://github.com/TechStark/express-mock-api-middleware).

Future versions will receive these additional features:

* [ ] Load `get` routes directly from `json` files.
* [ ] Add config options globally or to "globbed" routes
    * [ ] enable these rules "randomly" to simulate an unpredictable behavior
    * [ ] status code (e.g. easily return `404` for a set of routes)
    * [ ] error responses (with 50x status code and error response body)
    * [ ] server delays to fake slow responses
* [ ] Configure request conditions (.e.g. certain headers or query string in the request)
* [ ] Add helpers around the default express API to make using the request and sending responses easier

## Setup

Install this module
```sh
yarn add -D @mediamonks/monck
```

## Usage

Use the standalone server

```js
import path from 'path';
import { createServer } from '@mediamonks/monck';

// minimum
const app = createServer();

// all options (with defaults)
const app = createServer({
  mountPath: '/api/',
  host: 'localhost',
  port: '9002',
  useUnixSocket: false,
  socketPath: path.resolve(__dirname, './socket'), // default = path.resolve(process.cwd(), './socket')
  mockDir: path.resolve(__dirname, './mocks'), // default = path.resolve(process.cwd(), './mocks')
  ignore: ['*.sample.js'], // default = []
});
```

Or use the middleware in your existing server

```js
import express from 'express'

import { createMockMiddleWare } from '@mediamonks/monck';

const app = express();

// add middleware
app.use('/api/', createMockMiddleWare());

// with options
app.use('/api/', createMockMiddleWare('/api/', {
  ignore: ['*.sample.js']
}));

app.listen(9002, 'localhost', () => {
  console.info(`http://localhost:9002`);
});
```

## Options

Server options:
* `mountPath?: string` - On what path the mock API should be mounted. All configured mock endpoints will be prefixed 
  by this path.
* `useUnixSocket?: boolean` - Whether to use a unix socket to start the server instead of the default `host:port`. 
* `socketPath?: string` - Where to create the unix socket.
* `host?: string` - What port to use.
* `port?: number` - What host to use.

Middleware options:
* `mockDir?: string` - Where the mock config files can be found.
* `ignore?: string | Array<string>` - Add a pattern or an array of glob patterns to exclude matches. Note: ignore 
  patterns are _always_ in `dot:true` mode, regardless of any other settings - (See how to use ignore in options
  [options](https://github.com/isaacs/node-glob#options)).
  
## Mock configuration

All files in the configured `mock` directly will be required and watched for changes. The exported object keys will be 
added as routes to the server/middleware. Each route key is defined as `"[method] [path]"`.

The value of each key is either an `object` - which is directly returned as-is, or an express `RequestHandler` that 
is executed and allows you to fabricate your own response using `res.send()`.

```ts
// mocks/user.ts

import path from 'path';
import { existsSync } from 'fs';
import type { RequestConfig } from '@mediamonks/monck';

export default {
  // return static object
  'GET /user/info': {
    id: '123',
    userName: 'john123',
    email: 'john.doe@provider.org',
    firstName: 'John',
    lastName: 'Doe',
  },
  
  // execute logic
  'POST /user/login': (req, res) => {
    const { userName, password } = req.body;
    if (userName === 'john' && password === 'password') {
      res.send({
        success: true,
      });
    } else {
      res.send({
        success: false,
      });
    }
  },
  
  // do more custom logic
  'GET /product/:id': (req, res) => {
    const { id } = req.params;
    const productPath = path.join(__dirname, `products/${id}.json`);
    if (existsSync(productPath)) {
      res.sendFile(productPath);
    } else {
      res.sendFile(path.join(__dirname, `products/default.json`));
    }
  }
} as RequestConfig;
```

## Debugging

Set the `DEBUG` environment variable to see debug logs from this module.

```sh
DEBUG=monck
```
