import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const version = '0.17.0';
const directory = new URL(`../upstream/${version}/`, import.meta.url);
await mkdir(directory, { recursive: true });
const assets = [
  ['langref.html', `https://ziglang.org/documentation/${version}/`],
  ['std/index.html', `https://ziglang.org/documentation/${version}/std/`],
  ...['main.js', 'main.wasm', 'sources.tar'].map((name) => [
    `std/${name}`,
    `https://ziglang.org/documentation/${version}/std/${name}`,
  ]),
];
const records = [];
for (const [file, url] of assets) {
  const target = new URL(file, directory);
  await mkdir(new URL('./', target), { recursive: true });
  let bytes;
  try {
    bytes = await readFile(target);
  } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(target, bytes);
  }
  records.push({
    file,
    url,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
  console.log(`Snapshot ${file}: ${bytes.length} bytes`);
}
const indexResponse = await fetch('https://ziglang.org/download/index.json');
if (!indexResponse.ok)
  throw new Error('Unable to fetch official release index');
const index = await indexResponse.json();
const release = index[version];
if (release?.version !== version) throw new Error('Release version mismatch');
await mkdir(new URL('../.cache/', import.meta.url), { recursive: true });
const archive = new URL(`../.cache/zig-${version}.tar.xz`, import.meta.url);
let sourceArchive;
try {
  sourceArchive = await readFile(archive);
} catch {
  const response = await fetch(release.src.tarball, {
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error('Unable to fetch official source archive');
  sourceArchive = Buffer.from(await response.arrayBuffer());
  await writeFile(archive, sourceArchive);
}
if (
  createHash('sha256').update(sourceArchive).digest('hex') !==
  release.src.shasum
)
  throw new Error('Official source archive checksum mismatch');
const { fileURLToPath } = await import('node:url');
let license = spawnSync(
  'tar',
  ['-xOf', fileURLToPath(archive), `zig-${version}/LICENSE`],
  { encoding: 'utf8' },
);
if (license.status !== 0 && process.platform === 'win32') {
  license = spawnSync(
    'python',
    [
      '-c',
      'import sys, tarfile; sys.stdout.buffer.write(tarfile.open(sys.argv[1], "r:xz").extractfile(sys.argv[2]).read())',
      fileURLToPath(archive),
      `zig-${version}/LICENSE`,
    ],
    { encoding: 'utf8' },
  );
}
if (license.status !== 0) throw new Error(license.stderr);
await writeFile(new URL('LICENSE', directory), license.stdout);
records.push({
  file: 'LICENSE',
  url: release.src.tarball,
  archiveSha256: release.src.shasum,
  sha256: createHash('sha256').update(license.stdout).digest('hex'),
});
let capturedAt = new Date().toISOString();
try {
  capturedAt = JSON.parse(
    await readFile(new URL('manifest.json', directory)),
  ).capturedAt;
} catch {}
await writeFile(
  new URL('manifest.json', directory),
  `${JSON.stringify({ version, capturedAt, releaseDate: release.date, assets: records }, null, 2)}\n`,
);
