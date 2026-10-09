import type { LucideIconData } from 'lucide-react';
import type { IconName } from 'lucide-react/dynamic';

/** Loads only a named Lucide icon, keeping the import catalog out of the initial bundle. */
export async function load(name: string): Promise<LucideIconData> {
    // Resolve the trusted import catalog lazily and reject inherited or unknown names.
    const { default: imports } = await import('lucide-react/dynamicIconImports.mjs');

    if (!Object.hasOwn(imports, name)) throw new Error('Unknown Lucide icon');

    // SAFETY: The own-property check restricts the name to the installed Lucide import catalog.
    const loader = imports[name as IconName];
    const icon = await loader();

    return icon.__iconData;
}
