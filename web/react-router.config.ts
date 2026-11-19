import path from 'node:path';
import { siteUrl } from './src/site';
import type { Config } from '@react-router/dev/config';
import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

const requestedMode = import.meta.env.MODE;

// React Router's prerender preview reloads this config in production mode.
if (requestedMode === 'api' || requestedMode === 'sdk') {
    process.env.LONGLINK_WEB_TARGET = requestedMode;
}

const isSolution = process.env.LONGLINK_WEB_TARGET === 'sdk';

// Only Platform builds need the documentation catalog for publication paths.
const { legalPaths, brandingPaths, documentationPaths } = isSolution
    ? { legalPaths: [], brandingPaths: [], documentationPaths: [] }
    : await import('./src/platform/publications');

const publicPagePaths = [
    '/',
    '/login',
    '/pricing',
    '/blog',
    '/blog/why-longlink',
    ...legalPaths,
    ...brandingPaths,
    ...documentationPaths
];

const outputDirectory = path.resolve(
    import.meta.dirname,
    isSolution ? '../sdk/longlink/.static/web' : '../api/src/.static/web'
);

export default {
    appDirectory: isSolution ? 'src/solution' : 'src/platform',
    buildDirectory: path.resolve(import.meta.dirname, 'build', isSolution ? 'sdk' : 'api'),
    ssr: false,

    // Discover route dependencies before serving modules instead of re-optimizing them during page loading.
    future: { unstable_optimizeDeps: true },
    prerender: isSolution
        ? undefined
        : [...publicPagePaths, '/404'].map((pagePath) => (pagePath === '/' ? '/' : `${pagePath}/`)),

    /** Adapts Framework Mode's output to the embedded FastAPI frontend contract. */
    async buildEnd({ reactRouterConfig }) {
        const clientDirectory = path.join(reactRouterConfig.buildDirectory, 'client');

        // Package the component runtime only with the SDK that owns it.
        if (isSolution) {
            const [{ default: ts }, { generateDtsBundle }, { default: iconImports }] = await Promise.all([
                import('typescript'),
                import('dts-bundle-generator'),
                import('lucide-react/dynamicIconImports.mjs')
            ]);
            const entry = path.join(import.meta.dirname, 'scripts/frontend.ts');
            const configPath = path.join(import.meta.dirname, 'tsconfig.app.json');
            const config = ts.readConfigFile(configPath, ts.sys.readFile);
            const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, import.meta.dirname);
            const program = ts.createProgram([entry], options);
            const checker = program.getTypeChecker();
            const source = program.getSourceFile(entry);
            const symbol = source && checker.getSymbolAtLocation(source);
            if (!symbol) throw new Error('Frontend declaration entry could not be resolved.');
            const exports = checker.getExportsOfModule(symbol);
            const libraries = new Set<string>();
            for (const file of program.getSourceFiles()) {
                const name = file.fileName.split('/node_modules/').at(-1);
                if (!name || name === file.fileName) continue;
                const pkg = name
                    .split('/')
                    .slice(0, name.startsWith('@') ? 2 : 1)
                    .join('/');
                if (pkg !== 'lucide-react') libraries.add(pkg);
            }

            const [bundle] = generateDtsBundle(
                [
                    {
                        filePath: entry,
                        libraries: { inlinedLibraries: [...libraries], allowedTypesLibraries: [] },
                        output: { noBanner: true, umdModuleName: 'NativeFrontend', exportReferencedTypes: false }
                    }
                ],
                { preferredConfigPath: configPath }
            );
            if (!bundle) throw new Error('Frontend declaration bundle is empty.');

            const dom = new Set(
                program
                    .getSourceFiles()
                    .filter((file) => file.hasNoDefaultLib && file.fileName.endsWith('/lib.dom.d.ts'))
                    .flatMap((file) => file.statements.filter(ts.isInterfaceDeclaration).map((node) => node.name.text))
            );
            const reactDom = program
                .getSourceFiles()
                .find((file) => file.fileName.endsWith('/@types/react/global.d.ts'));
            if (!reactDom) throw new Error('React DOM fallback declarations could not be resolved.');
            const fallbacks = new Set(
                reactDom.statements.filter(ts.isInterfaceDeclaration).map((node) => node.name.text)
            );
            const declarations = ts.createSourceFile('frontend.native.d.ts', bundle, ts.ScriptTarget.Latest, true);
            const statements = declarations.statements.filter((node) => {
                if (ts.isImportDeclaration(node)) {
                    if (
                        ts.isStringLiteral(node.moduleSpecifier) &&
                        node.moduleSpecifier.text === 'lucide-react/dynamic' &&
                        node.importClause?.namedBindings?.getText() === '{ IconName }'
                    )
                        return false;
                    throw new Error(`Unbundled SDK dependency: ${node.getText()}`);
                }
                return !(
                    ts.isInterfaceDeclaration(node) &&
                    !node.members.length &&
                    dom.has(node.name.text) &&
                    fallbacks.has(node.name.text)
                );
            });
            const native =
                statements
                    .map((node) => node.getFullText(declarations))
                    .join('')
                    .replace(/[ \t]+$/gm, '')
                    .trim() + '\n';
            const globals = await readFile(path.join(import.meta.dirname, 'scripts/frontend.globals.d.ts'), 'utf8');
            const aliases = exports
                .map(({ name }) => name)
                .filter((name) => !['Image', 'Text', 'Map', 'FrontendElement'].includes(name))
                .sort()
                .map((name) => `import ${name} = NativeFrontend.${name};`)
                .join('\n');
            const icons = Object.keys(iconImports)
                .map((name) => JSON.stringify(name))
                .join(' | ');
            const declarationDirectory = path.resolve(import.meta.dirname, '../sdk/longlink/.static/jsx');
            await mkdir(declarationDirectory, { recursive: true });
            await writeFile(path.join(declarationDirectory, 'frontend.native.d.ts'), native);
            await writeFile(
                path.join(declarationDirectory, 'frontend.d.ts'),
                `/// <reference path="./frontend.native.d.ts" />\n${globals.trimEnd()}\n\ntype IconName = ${icons};\n\n${aliases}\n`
            );

            await cp(path.join(import.meta.dirname, 'build/views'), path.join(clientDirectory, 'views'), {
                recursive: true
            });

            // Solutions retain the shared wordmark without publishing Platform images or the public agent guide.
            await rm(path.join(clientDirectory, 'images'), { force: true, recursive: true });
            await rm(path.join(clientDirectory, 'llms.txt'), { force: true });

            // Include both theme variants used by the shared navigation header.
            await mkdir(path.join(clientDirectory, 'images'), { recursive: true });

            for (const mode of ['light', 'dark']) {
                const filename = `longlink-wordmark-${mode}.png`;
                await cp(
                    path.join(import.meta.dirname, 'public', 'images', filename),
                    path.join(clientDirectory, 'images', filename)
                );
            }
        } else {
            // Publish valid SPA paths from React Router so the server can reject unknown URLs.
            const routes = Object.values(reactRouterConfig.routes);
            const parentIds = new Set(routes.map((route) => route.parentId));

            // Exclude layouts and error routes from the application's valid page inventory.
            const spaPaths = routes.flatMap((route) => {
                if (parentIds.has(route.id) || route.file.endsWith('/not-found.tsx')) return [];

                // Resolve layout and prefix segments before translating parameters for FastAPI.
                const segments = [];
                let currentRoute: typeof route | undefined = route;

                while (currentRoute) {
                    if (currentRoute.path) segments.unshift(currentRoute.path);
                    currentRoute = currentRoute.parentId ? reactRouterConfig.routes[currentRoute.parentId] : undefined;
                }

                const pagePath = `/${segments.join('/')}`;

                if (publicPagePaths.includes(pagePath)) return [];

                // React Router splats also match the Solution root without a trailing slash.
                const paths = pagePath.endsWith('/*') ? [pagePath.slice(0, -2), pagePath] : [pagePath];

                return paths.map((routePath) => routePath.replace(/:([^/]+)/g, '{$1}').replace(/\*/g, '{path:path}'));
            });

            await writeFile(path.join(clientDirectory, 'spa.json'), JSON.stringify(spaPaths));

            // Generate crawler configuration from prerendered pages, excluding login.
            const urls = publicPagePaths
                .flatMap((pagePath) =>
                    pagePath === '/login'
                        ? []
                        : [
                              `    <url><loc>${new URL(pagePath === '/' ? '/' : `${pagePath}/`, siteUrl).href}</loc></url>`
                          ]
                )
                .join('\n');

            await writeFile(
                path.join(clientDirectory, 'sitemap.xml'),
                `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
            );
            await writeFile(
                path.join(clientDirectory, 'robots.txt'),
                `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', siteUrl).href}\n`
            );

            // Keep the prerendered home page and the generic document for known SPA routes.
            await rename(path.join(clientDirectory, 'index.html'), path.join(clientDirectory, '__root.html'));
            await rename(path.join(clientDirectory, '__spa-fallback.html'), path.join(clientDirectory, 'index.html'));

            // FastAPI's static frontend serves this prerendered document with HTTP 404.
            await rename(path.join(clientDirectory, '404', 'index.html'), path.join(clientDirectory, '404.html'));
        }

        // Publish only browser assets into the Python package tree.
        await rm(outputDirectory, { force: true, recursive: true });
        await mkdir(path.dirname(outputDirectory), { recursive: true });
        await rename(clientDirectory, outputDirectory);
    }
} satisfies Config;
