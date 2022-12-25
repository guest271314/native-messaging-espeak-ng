#!/usr/bin/env -S ./deno run --allow-run --unstable --v8-flags="--expose-gc,--jitless"
async function getMessage() {
  const header = new Uint32Array(1);
  await Deno.stdin.read(header);
  const output = new Uint8Array(header[0]);
  await Deno.stdin.read(output);
  return output;
}

async function sendMessage(_) {
  let message = '';
  let process = Deno.run({
    cmd: ['pgrep', '-f', './deno_server.js'],
    stdout: 'piped',
    stderr: 'piped',
  });
  let rawOutput = await process.output();
  process.close();
  if (rawOutput.length) {
    process = Deno.run({
      cmd: ['pkill', '-f', './deno_server.js'],
      stdout: 'null',
      stderr: 'null',
    });
    process.close();
    message = '"Local server off."';
  } else {
    process = Deno.run({
      cmd: ['./deno_server.js'],
      stdout: 'null',
      stderr: 'null',
    });
    message = '"Local server on."';
  }
  message = new TextEncoder().encode(message);
  const header = Uint32Array.from(
    {
      length: 4,
    },
    (_, index) => (message.length >> (index * 8)) & 0xff
  );
  const output = new Uint8Array(header.length + message.length);
  output.set(header, 0);
  output.set(message, 4);
  await Deno.stdout.write(output.buffer);
}

async function main() {
  while (true) {
    const message = await getMessage();
    await sendMessage(message);
    gc();
  }
}

try {
  main();
} catch (e) {
  Deno.exit();
}
