// Regenerates src/components/globe-land-path.ts from world-atlas TopoJSON.
//
// Run with: bun run generate:globe-land
// Keep the projection parameters below in sync with the constants in src/components/Globe.tsx.
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { writeFile } from 'node:fs/promises';
import { geoOrthographic, geoPath } from 'd3-geo';
import land110m from 'world-atlas/land-110m.json' with { type: 'json' };

const centerX = 700;
const centerY = 720;
const radiusY = 535;
const rotate = [35, -18] as const;

// Cast the static TopoJSON import at the data boundary; world-atlas exposes a borderless land object.
const land = feature(land110m as unknown as Parameters<typeof feature>[0], 'land');

// Project the land once because the hero globe is a static background asset.
const landPath =
    geoPath(
        geoOrthographic()
            .translate([centerX, centerY])
            .scale(radiusY)
            .rotate([...rotate])
            .clipAngle(90)
    )(land) ?? '';

const output = [
    '// Precomputed orthographic projection of world-atlas land-110m.',
    '// Regenerate with: bun run generate:globe-land',
    '',
    `export const LAND_PATH = ${JSON.stringify(landPath)};`,
    '',
].join('\n');

await writeFile(fileURLToPath(new URL('../src/components/globe-land-path.ts', import.meta.url)), output);
console.log(`Regenerated globe-land-path.ts (${landPath.length} characters).`);
