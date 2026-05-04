import { $ } from 'bun';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(scriptDir, '..');
const repoRoot = resolve(docsDir, '..');
const sourceDir = resolve(repoRoot, 'sdk/longlink/.static/xsd');
const targetDir = resolve(docsDir, 'src/public');
const targetFile = resolve(targetDir, 'schema.xsd');

/**
 * Bundle a schema file by inlining all included schemas once.
 */
function bundleSchema(filePath: string, seen: Set<string>): string {
  const normalizedPath = resolve(filePath);
  if (seen.has(normalizedPath)) {
    return '';
  }

  seen.add(normalizedPath);

  const source = readFileSync(normalizedPath, 'utf8');
  const includePattern = /<xsd:include\s+schemaLocation="([^"]+)"\s*\/>/g;
  const innerContent = source
    .replace(/<\?xml[^>]*\?>\s*/g, '')
    .replace(/<xsd:schema[^>]*>\s*/g, '')
    .replace(/\s*<\/xsd:schema>\s*/g, '');

  return innerContent.replace(includePattern, (_match, schemaLocation: string) => {
    const includedPath = resolve(dirname(normalizedPath), schemaLocation);
    return bundleSchema(includedPath, seen);
  });
}

await $`rm -rf ${resolve(targetDir, 'xsd')}`;
await $`mkdir -p ${targetDir}`;

const bundledSchema = bundleSchema(resolve(sourceDir, 'schema.xsd'), new Set<string>());
writeFileSync(targetFile, `<?xml version="1.0" encoding="UTF-8"?>\n<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n${bundledSchema.trim()}\n</xsd:schema>\n`);
