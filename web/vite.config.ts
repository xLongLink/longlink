import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

type LucideIconNode = Array<[string, Record<string, string>]>;
type LucideIconModule = { __iconNode: LucideIconNode };
type LucideIconImport = () => Promise<LucideIconModule>;

let lucideIconImports: Promise<Record<string, LucideIconImport>> | null = null;
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

/** Serves and emits Lucide SVG assets without adding every icon to the JS graph. */
function lucideIconAssets(): Plugin {
    return {
        name: 'longlink-lucide-icon-assets',
        configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                const requestUrl = new URL(request.url ?? '/', 'http://localhost');

                if (!requestUrl.pathname.startsWith('/lucide-icons/') || !requestUrl.pathname.endsWith('.svg')) {
                    next();
                    return;
                }

                const iconName = decodeURIComponent(
                    requestUrl.pathname.slice('/lucide-icons/'.length).replace(/\.svg$/, '')
                );
                const iconImports = await loadLucideIconImports();
                const importIcon = iconImports[iconName];

                if (!importIcon) {
                    response.statusCode = 404;
                    response.end('Icon not found');
                    return;
                }

                const iconModule = await importIcon();
                response.setHeader('content-type', 'image/svg+xml; charset=utf-8');
                response.setHeader('cache-control', 'no-cache');
                response.end(renderLucideSvg(iconModule.__iconNode));
            });
        },
        async generateBundle() {
            const iconImports = await loadLucideIconImports();

            for (const [iconName, importIcon] of Object.entries(iconImports)) {
                const iconModule = await importIcon();
                this.emitFile({
                    type: 'asset',
                    fileName: `lucide-icons/${iconName}.svg`,
                    source: renderLucideSvg(iconModule.__iconNode),
                });
            }
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const isSdkBuild = mode === 'sdk';
    const buildOutDir = isSdkBuild
        ? path.resolve(__dirname, '../sdk/longlink/.static/web')
        : path.resolve(__dirname, '../api/src/.static/web');

    const devServerPort = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173;

    return {
        plugins: [react(), tailwindcss(), lucideIconAssets()],

        envPrefix: ['VITE_', 'VERSION'],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@ui': path.resolve(__dirname, './src/components/ui'),
                '@xml': path.resolve(__dirname, './src/xml'),
            },
        },

        build: {
            outDir: buildOutDir,
            emptyOutDir: true,
        },

        server: {
            host: '0.0.0.0',
            port: devServerPort,
            proxy: {
                '/api': 'http://localhost:8000',
                '/auth': 'http://localhost:8000',
            },
        },
    };
});
