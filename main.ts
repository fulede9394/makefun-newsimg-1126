// A news-image entry (Node 22, standard library only): the front page is the
// entry.png beside this file, and this program delivers it to
// /output/entry.png. The run is fully deterministic — same bytes in, same
// bytes out — because the image is a fixed asset, not drawn at run time.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The gate's limits for this bounty: a whole PNG of at most 1 MiB and at
// most 1024 by 1024 pixels. Anything bigger never reaches the judge.
const CAPS = Object.freeze({ maxBytes: 1048576, name: "entry.png" });

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

class Entry {
  constructor() {
    this.here = dirname(fileURLToPath(import.meta.url));
    this.source = join(this.here, CAPS.name);
    this.outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
    this.target = join(this.outDir, CAPS.name);
  }

  async load() {
    const bytes = await readFile(this.source);
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!bytes.subarray(0, 8).equals(pngMagic)) {
      throw new Error(`${CAPS.name} does not start with the PNG signature`);
    }
    if (bytes.length > CAPS.maxBytes) {
      throw new Error(`${CAPS.name} is ${bytes.length} bytes, over the 1 MiB cap`);
    }
    return bytes;
  }

  async publish(bytes) {
    await mkdir(this.outDir, { recursive: true });
    await writeFile(this.target, bytes);
    const again = await readFile(this.target);
    if (sha256(again) !== sha256(bytes)) {
      throw new Error("copy is not byte-for-byte the source image");
    }
    return again.length;
  }
}

const entry = new Entry();
const bytes = await entry.load();
const written = await entry.publish(bytes);
console.log(`delivered ${CAPS.name} (${written} bytes, sha256 ${sha256(bytes).slice(0, 16)}…)`);
