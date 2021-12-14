import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response, ParamsDictionary } from 'express-serve-static-core';
import { join, resolve } from 'path';
import bodyParser from 'body-parser';
import glob from 'glob';
import assert from 'assert';
import chokidar from 'chokidar';
import { Key, pathToRegexp } from 'path-to-regexp';
import signale from 'signale';
import multer from 'multer';
import typedObjectKeys from './type-utils/typedObjectKeys.js';

// const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head'];
const BODY_PARSED_METHODS = ['post', 'put', 'patch', 'delete'];
const USE_ESM = typeof require === 'undefined';

import debugLib from 'debug';
const debug = debugLib('monck');

export type MockOptions = {
  ignore?: string | Array<string>;
};

type RequestMethod = 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
type MockConfig = {
  method: RequestMethod;
  path: string;
  re: RegExp;
  keys: Array<Key>;
  handler: RequestHandler;
};

export type RequestConfig = Record<string, RequestHandler | Record<string, any>>;

export default function getMockMiddleware(mockDir?: string, options?: MockOptions) {
  const absMockPath = mockDir ?? resolve(process.cwd(), './mocks');
  const errors: Array<Error> = [];

  let mockDataPromise = getConfig();
  watch();

  function watch() {
    if (process.env.WATCH_FILES === 'none') return;
    const watcher = chokidar.watch([absMockPath], {
      ignoreInitial: true,
    });
    watcher.on('all', (event, file) => {
      debug(`[${event}] ${file}, reload mock data`);
      mockDataPromise = getConfig();
      if (!errors.length) {
        signale.success(`Mock file parse success`);
      }
    });
  }

  async function getConfig(): Promise<Array<MockConfig>> {
    // Clear errors
    errors.splice(0, errors.length);

    cleanRequireCache();
    let ret = {};
    const mockFiles = glob
      .sync('**/*.@(cjs|mjs|js|ts)', {
        cwd: absMockPath,
        ignore: (options || {}).ignore || [],
      })
      .map((p) => join(absMockPath, p));
    debug(`load mock data from ${absMockPath}, including files ${JSON.stringify(mockFiles)}`);
    try {
      ret = (
        await Promise.all(
          mockFiles.map(async (mockFile) => {
            const module = await (USE_ESM
              ? import(`${mockFile}?cache=${Math.random()}`)
              : require(mockFile));
            return module.default || module;
          }),
        )
      ).reduce((obj, config) => ({ ...obj, ...config }), {});
    } catch (e: unknown) {
      errors.push(e as Error);
      signale.error(`Mock file parse failed: ${(e as Error).message}`);
    }
    return normalizeConfig(ret);
  }

  function parseKey(key: string): { method: RequestMethod; path: string } {
    let method = 'get' as RequestMethod;
    let path = key;
    if (key.indexOf(' ') > -1) {
      const splited = key.split(' ');
      method = splited[0].toLowerCase() as RequestMethod;
      path = splited[1]; // eslint-disable-line
    }
    // debug(`parsed: ${method} ${path}`);
    // assert(
    //   VALID_METHODS.includes(method),
    //   `Invalid method ${method} for path ${path}, please check your mock files.`
    // );
    return {
      method,
      path,
    };
  }

  function createHandler(
    method: RequestMethod,
    path: string,
    handler: RequestHandler | Record<string, any>,
  ) {
    return function (req: Request, res: Response, next: NextFunction) {
      if (BODY_PARSED_METHODS.includes(method)) {
        bodyParser.json({ limit: '5mb', strict: false })(req, res, () => {
          bodyParser.urlencoded({ limit: '5mb', extended: true })(req, res, () => {
            sendData();
          });
        });
      } else {
        sendData();
      }

      function sendData() {
        if (typeof handler === 'function') {
          multer().any()(req, res, () => {
            handler(req, res, next);
          });
        } else {
          res.json(handler);
        }
      }
    };
  }

  function normalizeConfig(config: RequestConfig) {
    return typedObjectKeys(config).reduce((memo, key) => {
      const handler = config[key];
      const type = typeof handler;
      assert(
        type === 'function' || type === 'object',
        `mock value of ${key} should be function or object, but got ${type}`,
      );
      const { method, path } = parseKey(key);
      const keys: Array<Key> = [];
      // const pathOptions = {
      //   whitelist: ['%'], // treat %3A as regular chars
      // };
      const re = pathToRegexp(path, keys);
      // debug(re);
      memo.push({
        method,
        path,
        re,
        keys,
        handler: createHandler(method, path, handler),
      });
      return memo;
    }, [] as Array<{ method: RequestMethod; path: string; re: RegExp; keys: Array<Key>; handler: RequestHandler }>);
  }

  function cleanRequireCache() {
    if (!USE_ESM) {
      Object.keys(require.cache).forEach((file) => {
        if (file.indexOf(absMockPath) > -1) {
          delete require.cache[file];
        }
      });
    }
  }

  function matchMock(req: Request, mockData: Array<MockConfig>) {
    const targetPath = req.path;
    const targetMethod = req.method.toLowerCase();
    // debug(`${targetMethod} ${targetPath}`);

    for (const mock of mockData) {
      const { method, re, keys } = mock;
      if (method === targetMethod) {
        const match = re.exec(targetPath);
        if (match) {
          const params: ParamsDictionary = {};

          for (let i = 1; i < match.length; i += 1) {
            const key = keys[i - 1];
            const prop = key.name;
            const val = decodeParam(match[i]);

            // @ts-ignore
            if (val !== undefined || !hasOwnProperty.call(params, prop)) {
              params[prop] = val;
            }
          }
          req.params = params;
          return mock;
        }
      }
    }

    function decodeParam(val: string) {
      if (typeof val !== 'string' || val.length === 0) {
        return val;
      }

      try {
        return decodeURIComponent(val);
      } catch (err) {
        if (err instanceof URIError) {
          err.message = `Failed to decode param ' ${val} '`;
          (err as any).status = 400;
          (err as any).statusCode = 400;
        }

        throw err;
      }
    }

    return mockData.filter(({ method, re }) => {
      return method === targetMethod && re.test(targetPath);
    })[0];
  }

  return async function mockMiddleware(req: Request, res: Response, next: NextFunction) {
    const mockData = await mockDataPromise;
    const match = matchMock(req, mockData);

    if (req.path === '/') {
      return res.send(`
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
      <div style="padding: 20px;">
        <h3>Overview of available mock APIs</h3>
        <ul style="list-style-type: none; padding-left: 0;">
        ${mockData
          .map((mock) => {
            const fullPath = `/api${mock.path}`;
            const mockMethod = mock.method.toUpperCase();
            return `<li><a href="${fullPath}">
          ${mock.method === 'get' ? `<span class="badge badge-success">${mockMethod}</span>` : ''}
          ${mock.method === 'post' ? `<span class="badge badge-primary">${mockMethod}</span>` : ''}
          ${mock.method === 'delete' ? `<span class="badge badge-danger">${mockMethod}</span>` : ''}
          ${mock.method === 'put' ? `<span class="badge badge-info">${mockMethod}</span>` : ''}
          ${mock.method === 'patch' ? `<span class="badge badge-info">${mockMethod}</span>` : ''}
          ${
            !['get', 'post', 'delete', 'put', 'patch'].includes(mock.method)
              ? `<span class="badge badge-secondary">${mockMethod}</span>`
              : ''
          }
           ${fullPath}
        </a></li>`;
          })
          .join('')}
        </ul>
        </div>`);
    }

    if (match) {
      debug(`mock matched: [${match.method}] ${match.path}`);
      return match.handler(req, res, next);
    } else {
      return next();
    }
  };
}
