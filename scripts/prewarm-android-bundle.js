/**
 * Pre-build the Android JS bundle so the dev client doesn't time out on first connect.
 * Run in a second terminal while `npm start` is running.
 *
 * Usage:
 *   npm run prewarm:android
 *   EXPO_METRO_PORT=8083 npm run prewarm:android
 */
const http = require("http");

const bundlePath =
  "/node_modules/expo-router/entry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable";

const DEFAULT_PORTS = [8081, 8082, 8083, 8084, 8085];

function checkMetroPort(port) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/status",
        timeout: 1500,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200 ? port : null);
      },
    );

    request.on("error", () => resolve(null));
    request.on("timeout", () => {
      request.destroy();
      resolve(null);
    });
  });
}

async function resolveMetroPort() {
  const explicitPort = process.env.EXPO_METRO_PORT ?? process.argv[2];
  if (explicitPort) {
    const port = Number(explicitPort);
    const ok = await checkMetroPort(port);
    if (ok) return ok;
    throw new Error(`Metro is not responding on port ${port}`);
  }

  const activePorts = [];
  for (const port of DEFAULT_PORTS) {
    const ok = await checkMetroPort(port);
    if (ok) activePorts.push(port);
  }

  if (activePorts.length === 0) {
    throw new Error(
      "Could not find Metro. Start it with `npx expo start --dev-client` first.",
    );
  }

  if (activePorts.length > 1) {
    console.warn(
      `Multiple Metro servers detected on ports ${activePorts.join(", ")}.`,
    );
    console.warn(
      "Stop old servers (Ctrl+C in other terminals) to avoid confusion.",
    );
  }

  // Prefer the highest port — Expo picks the next free port when 8081 is taken.
  return activePorts.at(-1);
}

function prewarmBundle(port) {
  const url = `http://127.0.0.1:${port}${bundlePath}`;

  console.log(`Pre-warming Android bundle from ${url}`);
  console.log("Keep the dev app closed on your phone until this finishes.\n");

  const started = Date.now();

  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
        process.stdout.write(
          `\rReceived ${(bytes / 1024 / 1024).toFixed(1)} MB...`,
        );
      });
      response.on("end", () => {
        const seconds = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`\nDone in ${seconds}s (HTTP ${response.statusCode}).`);
        if (response.statusCode === 200) {
          console.log("Open the dev app on your phone and tap Reload JS.");
          resolve();
        } else {
          reject(
            new Error(`Unexpected HTTP ${response.statusCode} from Metro.`),
          );
        }
      });
    });

    request.on("error", reject);
    request.setTimeout(10 * 60 * 1000, () => {
      request.destroy(new Error("Timed out after 10 minutes"));
    });
  });
}

async function main() {
  try {
    const port = await resolveMetroPort();
    console.log(`Found Metro on port ${port}.`);
    await prewarmBundle(port);
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  }
}

main();
