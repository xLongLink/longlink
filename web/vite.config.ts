import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import matter from 'gray-matter';
import { lexer, type Token } from 'marked';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';

/**
 * Loads markdown files as modules with build-time parsed frontmatter metadata.
 */
function markdownDocsPlugin(): Plugin {
    return {
        name: 'longlink-markdown-docs',
        enforce: 'pre',
        load(id) {
            const filepath = id.split('?', 1)[0];

            if (!filepath.endsWith('.md') || id.includes('?raw')) {
                return null;
            }

            this.addWatchFile(filepath);

            const source = matter.read(filepath, { excerpt: false });
            const blocks = parseMarkdownBlocks(source.content);
            const metadata = {
                lastUpdated: String(source.data.lastUpdated ?? ''),
                editUrl: String(source.data.editUrl ?? ''),
            };

            return `import { renderMarkdownDocument } from '@/lib/markdown';

export const metadata = ${JSON.stringify(metadata)};
export const content = renderMarkdownDocument(${JSON.stringify(blocks)});
export default content;`;
        },
    };
}

/** Parses markdown into block tokens and tab containers. */
function parseMarkdownBlocks(content: string): MarkdownBlock[] {
    const lines = content.split(/\r?\n/);
    const blocks: MarkdownBlock[] = [];
    const markdownLines: string[] = [];
    let tabs: MarkdownTab[] = [];
    let tabLabel = '';
    let tabLines: string[] = [];
    let inTabs = false;

    // Flush accumulated markdown as a token block.
    const flushMarkdown = () => {
        const markdown = markdownLines.join('\n').trim();

        if (markdown) {
            blocks.push({ kind: 'markdown', tokens: [...lexer(markdown)] });
        }

        markdownLines.length = 0;
    };

    // Flush the current tab into the tabs container.
    const flushTab = () => {
        if (!tabLabel) {
            tabLines.length = 0;
            return;
        }

        const content = tabLines.join('\n').trim();

        tabs.push({ label: tabLabel, tokens: [...lexer(content)] });
        tabLabel = '';
        tabLines.length = 0;
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (!inTabs) {
            if (trimmed === '::: tabs') {
                flushMarkdown();
                inTabs = true;
                continue;
            }

            markdownLines.push(line);
            continue;
        }

        if (trimmed === ':::') {
            flushTab();

            if (tabs.length > 0) {
                blocks.push({ kind: 'tabs', tabs });
            }

            tabs = [];
            inTabs = false;
            continue;
        }

        if (trimmed.startsWith('== ')) {
            flushTab();
            tabLabel = trimmed.slice(3).trim();
            continue;
        }

        if (!tabLabel && trimmed === '') {
            continue;
        }

        tabLines.push(line);
    }

    flushMarkdown();

    return blocks;
}

/** Markdown block token container emitted by the Vite plugin. */
type MarkdownBlock =
    | {
          kind: 'markdown';
          tokens: Token[];
      }
    | {
          kind: 'tabs';
          tabs: MarkdownTab[];
      };

/** Markdown tab emitted by the Vite plugin. */
type MarkdownTab = {
    label: string;
    tokens: Token[];
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const isSdkBuild = mode === 'sdk';
    const buildOutDir = isSdkBuild
        ? path.resolve(__dirname, '../sdk/longlink/.static/web')
        : path.resolve(__dirname, '../api/src/.static/web');

    const devServerPort = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173;

    return {
        plugins: [markdownDocsPlugin(), react(), tailwindcss()],

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
