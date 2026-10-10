/// <reference types="node" />
import { z } from 'zod';
import * as yaml from 'yaml';
import { readFileSync } from 'node:fs';

// Validate the shared YAML catalog before exposing it to routes or browser bundles.
const schema = z.array(
    z.object({
        name: z.string(),
        category: z.string(),
        introduction: z.string(),
        properties: z
            .array(
                z.object({
                    name: z.string(),
                    type: z.string(),
                    description: z.string().optional(),
                    default: z.json().optional(),
                })
            )
            .optional(),
        members: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
    })
);

/** Reads the documentation catalog for route generation and Vite's browser-module loader. */
export function loadCatalog() {
    // Read current source data so development rebuilds reflect catalog changes.
    const source = readFileSync(new URL('../../../sdk/longlink/.static/jsx/components.yml', import.meta.url), 'utf8');

    return schema.parse(yaml.parse(source));
}

export default loadCatalog();
