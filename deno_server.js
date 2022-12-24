// https://deno.land/manual@v1.26.2/runtime/http_server_apis_low_level
// Start listening on port 8080 of localhost.
const server = Deno.listenTls({
  port: 8443,
  certFile: 'certificate.pem',
  keyFile: 'certificate.key',
  alpnProtocols: ['h2', 'http/1.1'],
});
// console.log(`HTTP webserver running.  Access it at:  https://localhost:8443/`);
// Connections to the server will be yielded up as an async iterable.
for await (const conn of server) {
  // In order to not be blocking, we need to handle each connection individually
  // without awaiting the function
  serveHttp(conn);
}

async function serveHttp(conn) {
  // This "upgrades" a network connection into an HTTP connection.
  const httpConn = Deno.serveHttp(conn);
  // Each request sent over the HTTP connection will be yielded as an async
  // iterator from the HTTP connection.
  for await (const requestEvent of httpConn) {
    // The native HTTP server uses the web standard `Request` and `Response`
    // objects.
    let body = null;
    if (requestEvent.request.method === 'POST') {
      let json = await requestEvent.request.json();
      const process = Deno.run({
        cmd: json,
        stdout: 'piped',
        stderr: 'piped',
      });
      body = await process.output();
    }
    // The requestEvent's `.respondWith()` method is how we send the response
    // back to the client.
    requestEvent.respondWith(
      new Response(body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'unsafe-none',
          'Cross-Origin-Embedder-Policy': 'unsafe-none',
          'Access-Control-Allow-Origin':
            'chrome-extension://<id>',
          'Access-Control-Allow-Private-Network': 'true',
          'Access-Control-Allow-Headers':
            'Access-Control-Request-Private-Network',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,HEAD',
        },
      })
    );
  }
}
