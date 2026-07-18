// server/src/env.ts — load environment variables BEFORE anything reads them.
//
// Imported FIRST by index.ts. Because ES modules are evaluated in import order
// (depth-first), loading this sibling module before any other import guarantees
// process.env is populated before the rest of the app initializes.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url)); // server/src

// Single shared .env at the repo root (toolforge/.env) — the SAME file the
// Python engine reads. A missing file is fine: dotenv is a no-op and the server
// simply runs in demo mode.
loadEnv({ path: resolve(here, '../../.env') });

// Fallback: also honour a .env in the current working directory, if present.
// (dotenv never overwrites a variable already set, so the root .env wins.)
loadEnv();
