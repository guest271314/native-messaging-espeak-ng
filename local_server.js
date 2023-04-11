#!/usr/bin/env -S ./deno run -A --v8-flags="--expose-gc,--jitless"
// Deno Native Messaging host
// Local HTTPS sever
// guest271314, 2-15-2023
// https://github.com/denoland/deno/discussions/17236#discussioncomment-4566134
// https://github.com/saghul/txiki.js/blob/master/src/js/core/tjs/eval-stdin.js

const ERROR_SERVER_CLOSED = 'Server closed';
const INITIAL_ACCEPT_BACKOFF_DELAY = 5;
const MAX_ACCEPT_BACKOFF_DELAY = 100;
class Server {
  #port;
  #host;
  #handler;
  #closed = false;
  #listeners = new Set();
  #acceptBackoffDelayAbortController = new AbortController();
  #httpConnections = new Set();
  #onError;
  constructor(serverInit) {
    this.#port = serverInit.port;
    this.#host = serverInit.hostname;
    this.#handler = serverInit.handler;
    this.#onError =
      serverInit.onError ??
      function (error) {
        // console.error(error);
        return new Response('Internal Server Error', {
          status: 500,
        });
      };
  }
  async serve(listener) {
    if (this.#closed) {
      throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
    }
    this.#trackListener(listener);
    try {
      return await this.#accept(listener);
    } finally {
      this.#untrackListener(listener);
      try {
        listener.close();
      } catch {}
    }
  }
  async listenAndServe() {
    if (this.#closed) {
      throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
    }
    const listener = Deno.listen({
      port: this.#port ?? 80,
      hostname: this.#host ?? '0.0.0.0',
      transport: 'tcp',
    });
    return await this.serve(listener);
  }
  async listenAndServeTls(certFile, keyFile) {
    if (this.#closed) {
      throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
    }
    const listener = Deno.listenTls({
      port: this.#port ?? 443,
      hostname: this.#host ?? '0.0.0.0',
      certFile,
      keyFile,
      transport: 'tcp',
    });
    return await this.serve(listener);
  }
  close() {
    if (this.#closed) {
      throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
    }
    this.#closed = true;
    for (const listener of this.#listeners) {
      try {
        listener.close();
      } catch {}
    }
    this.#listeners.clear();
    this.#acceptBackoffDelayAbortController.abort();
    for (const httpConn of this.#httpConnections) {
      this.#closeHttpConn(httpConn);
    }
    this.#httpConnections.clear();
  }
  get closed() {
    return this.#closed;
  }
  get addrs() {
    return Array.from(this.#listeners).map((listener) => listener.addr);
  }
  async #respond(requestEvent, connInfo) {
    let response;
    try {
      response = await this.#handler(requestEvent.request, connInfo);
      if (response.bodyUsed && response.body !== null) {
        throw new TypeError('Response body already consumed.');
      }
    } catch (error) {
      response = await this.#onError(error);
    }
    try {
      await requestEvent.respondWith(response);
    } catch {}
  }
  async #serveHttp(httpConn, connInfo1) {
    while (!this.#closed) {
      let requestEvent1;
      try {
        requestEvent1 = await httpConn.nextRequest();
      } catch {
        break;
      }
      if (requestEvent1 === null) {
        break;
      }
      this.#respond(requestEvent1, connInfo1);
    }
    this.#closeHttpConn(httpConn);
  }
  async #accept(listener) {
    let acceptBackoffDelay;
    while (!this.#closed) {
      let conn;
      try {
        conn = await listener.accept();
      } catch (error1) {
        if (
          error1 instanceof Deno.errors.BadResource ||
          error1 instanceof Deno.errors.InvalidData ||
          error1 instanceof Deno.errors.UnexpectedEof ||
          error1 instanceof Deno.errors.ConnectionReset ||
          error1 instanceof Deno.errors.NotConnected
        ) {
          if (!acceptBackoffDelay) {
            acceptBackoffDelay = INITIAL_ACCEPT_BACKOFF_DELAY;
          } else {
            acceptBackoffDelay *= 2;
          }
          if (acceptBackoffDelay >= 1000) {
            acceptBackoffDelay = MAX_ACCEPT_BACKOFF_DELAY;
          }
          try {
            await delay(acceptBackoffDelay, {
              signal: this.#acceptBackoffDelayAbortController.signal,
            });
          } catch (err) {
            if (!(err instanceof DOMException && err.name === 'AbortError')) {
              throw err;
            }
          }
          continue;
        }
        throw error1;
      }
      acceptBackoffDelay = undefined;
      let httpConn1;
      try {
        httpConn1 = Deno.serveHttp(conn);
      } catch {
        continue;
      }
      this.#trackHttpConnection(httpConn1);
      const connInfo2 = {
        localAddr: conn.localAddr,
        remoteAddr: conn.remoteAddr,
      };
      this.#serveHttp(httpConn1, connInfo2);
    }
  }
  #closeHttpConn(httpConn2) {
    this.#untrackHttpConnection(httpConn2);
    try {
      httpConn2.close();
    } catch {}
  }
  #trackListener(listener1) {
    this.#listeners.add(listener1);
  }
  #untrackListener(listener2) {
    this.#listeners.delete(listener2);
  }
  #trackHttpConnection(httpConn3) {
    this.#httpConnections.add(httpConn3);
  }
  #untrackHttpConnection(httpConn4) {
    this.#httpConnections.delete(httpConn4);
  }
}

function delay(ms, options = {}) {
  const { signal, persistent } = options;
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Delay was aborted.', 'AbortError'));
  }
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(i);
      reject(new DOMException('Delay was aborted.', 'AbortError'));
    };
    const done = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const i = setTimeout(done, ms);
    signal?.addEventListener('abort', abort, {
      once: true,
    });
    if (persistent === false) {
      try {
        Deno.unrefTimer(i);
      } catch (error) {
        if (!(error instanceof ReferenceError)) {
          throw error;
        }
        //console.error('`persistent` option is only available in Deno');
      }
    }
  });
}

async function serveTls(handler, options) {
  // console.log(options);
  if (!options.key && !options.keyFile) {
    throw new Error("TLS config is given, but 'key' is missing.");
  }
  if (!options.cert && !options.certFile) {
    throw new Error("TLS config is given, but 'cert' is missing.");
  }
  let port = options.port ?? 8443;
  const hostname = options.hostname ?? '0.0.0.0';
  const server = new Server({
    port,
    hostname,
    handler,
    onError: options.onError,
  });
  // Is this ever called?
  options?.signal?.addEventListener('abort', () => server.close(), {
    once: true,
  });
  const key = options.key || Deno.readTextFileSync(options.keyFile);
  const cert = options.cert || Deno.readTextFileSync(options.certFile);
  const listener = Deno.listenTls({
    port,
    hostname,
    cert,
    key,
    transport: 'tcp',
  });
  const s = server.serve(listener);
  port = server.addrs[0].port;
  if ('onListen' in options) {
    options.onListen?.({
      port,
      hostname,
    });
  } else {
  }

  return server;
}

async function webserver() {
  const responseInit = {
    duplex: 'half',
    keepalive: true,
    headers: {
      'Content-Type': 'audio/wav',
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'Access-Control-Allow-Origin': 'chrome-extension://<id>',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Allow-Headers': 'Access-Control-Request-Private-Network',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,HEAD',
    },
  };
  const controller = new AbortController();
  const { signal } = controller;
  await serveTls(
    async (request) => {
      let body = null;
      if (request.method === 'OPTIONS' || request.method === 'HEAD') {
        return new Response(null, responseInit);
      }
      const text = await request.json();
      const json = text.cmd.split(' ').concat(text.input);
      const program = json.shift();
      if (commands.has(program)) {
        const command = new Deno.Command(program, {
          args: json,
          stdout: 'piped',
          stdin: 'piped',
        });
        const process = command.spawn();
        const reader = process.stdout.getReader();
        body = new ReadableStream({
          async pull(c) {
            const { value, done } = await reader.read();
            if (done) {
              c.close();
            }
            c.enqueue(value);
          },
          async cancel(reason) {
            process.kill('SIGKILL');
            server = null;
            controller = null;
          },
        });
      }
      return new Response(body, responseInit);
    },
    {
      certFile: 'certificate.pem',
      keyFile: 'certificate.key',
      signal,
    }
  );
}

const commands = new Set();
commands.add('espeak-ng');

let server;
async function readFullAsync(length) {
  const buffer = new Uint8Array(65536);
  const data = [];
  let n = null;
  while (data.length < length && (n = await Deno.stdin.read(buffer))) {
    data.push(...buffer.subarray(0, n));
  }
  return new Uint8Array(data);
}

async function getMessage() {
  const header = new Uint32Array(1);
  await Deno.stdin.read(new Uint8Array(header.buffer));
  return readFullAsync(header[0]);
}

const encoder = new TextEncoder();

async function sendMessage(message) {
  message = encoder.encode(JSON.stringify(message));
  const header = new Uint32Array([message.length]);
  await Deno.stdout.write(new Uint8Array(header.buffer));
  await Deno.stdout.write(message);
}

async function main() {
  while (true) {
    let message = await getMessage();
    if (!server) {
      server = webserver();
      message = 'Local server on';
    } else {
      message = 'Local server off';
    }
    await sendMessage(message);
    gc();
    if (message.includes('off')) {
      Deno.exit();
    }
  }
}

try {
  main();
} catch (e) {
  Deno.exit();
}
