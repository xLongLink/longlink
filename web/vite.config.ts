import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

type LucideIconNode = Array<[string, Record<string, string>]>;
type LucideIconModule = { __iconNode: LucideIconNode };
type LucideIconImport = () => Promise<LucideIconModule>;
type LucideIconAssetsOptions = {
    loadIconImports?: () => Promise<Record<string, LucideIconImport>>;
    loadSvg?: (iconName: string) => Promise<string | null>;
};

let lucideIconImports: Promise<Record<string, LucideIconImport>> | null = null;
const lucideIconAssetDirectory = 'lucide-icons';
const lucideIconAssetPath = `/${lucideIconAssetDirectory}/`;
// Keep this path opaque to TypeScript because Lucide does not ship types for this build-only submodule.
const lucideIconImportsModule: string = 'lucide-react/dynamicIconImports.mjs';

/** Returns Lucide's generated icon import table. */
async function loadLucideIconImports(): Promise<Record<string, LucideIconImport>> {
    lucideIconImports ??= import(lucideIconImportsModule).then(
        (module) => module.default as Record<string, LucideIconImport>
    );

    return lucideIconImports;
}

/** Escapes a value for safe SVG attribute rendering. */
function escapeSvgAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renders one SVG attribute object. */
function renderSvgAttributes(attributes: Record<string, string>): string {
    return Object.entries(attributes)
        .filter(([name]) => name !== 'key')
        .map(([name, value]) => `${name}="${escapeSvgAttribute(String(value))}"`)
        .join(' ');
}

/** Renders one Lucide icon node as a standalone SVG asset. */
function renderLucideSvg(iconNode: LucideIconNode): string {
    const children = iconNode.map(([tag, attributes]) => `<${tag} ${renderSvgAttributes(attributes)} />`).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

/** Returns one named Lucide icon rendered as an SVG asset. */
async function loadLucideSvg(iconName: string): Promise<string | null> {
    const iconImports = await loadLucideIconImports();
    const importIcon = iconImports[iconName];

    if (!importIcon) {
        return null;
    }

    const iconModule = await importIcon();

    return renderLucideSvg(iconModule.__iconNode);
}

/** Serves and emits Lucide SVG assets without adding every icon to the JS graph. */
export function lucideIconAssets(options: LucideIconAssetsOptions = {}): Plugin {
    const loadIconImportsForPlugin = options.loadIconImports ?? loadLucideIconImports;
    const loadSvgForPlugin = options.loadSvg ?? loadLucideSvg;

    return {
        name: 'longlink-lucide-icon-assets',
        configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                const requestUrl = new URL(request.url ?? '/', 'http://localhost');

                if (!requestUrl.pathname.startsWith(lucideIconAssetPath) || !requestUrl.pathname.endsWith('.svg')) {
                    next();
                    return;
                }

                const iconName = decodeURIComponent(
                    requestUrl.pathname.slice(lucideIconAssetPath.length).replace(/\.svg$/, '')
                );
                const svg = await loadSvgForPlugin(iconName);

                if (svg === null) {
                    response.statusCode = 404;
                    response.end('Icon not found');
                    return;
                }

                response.setHeader('content-type', 'image/svg+xml; charset=utf-8');
                response.setHeader('cache-control', 'no-cache');
                response.end(svg);
            });
        },
        async generateBundle() {
            const iconImports = await loadIconImportsForPlugin();

            for (const iconName of Object.keys(iconImports)) {
                const svg = await loadSvgForPlugin(iconName);

                if (svg === null) {
                    continue;
                }

                this.emitFile({
                    type: 'asset',
                    fileName: `${lucideIconAssetDirectory}/${iconName}.svg`,
                    source: svg,
                });
            }
        },
    };
}

/** Resolves the bundle output directory for one Vite mode. */
export function resolveBuildOutDir(mode: string): string {
    return mode === 'sdk'
        ? path.resolve(__dirname, '../sdk/longlink/.static/web')
        : path.resolve(__dirname, '../api/src/.static/web');
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const devServerPort = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173;

    return {
        plugins: [react(), tailwindcss(), lucideIconAssets()],

        envPrefix: ['VITE_', 'VERSION'],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        build: {
            outDir: resolveBuildOutDir(mode),
            emptyOutDir: true,
        },

        server: {
            host: '0.0.0.0',
            port: devServerPort,
            proxy: {
                '/api': 'http://localhost:8000',
                '/auth': 'http://localhost:8000',
                '/logo.svg': 'http://localhost:8000',
            },
        },
    };
});
