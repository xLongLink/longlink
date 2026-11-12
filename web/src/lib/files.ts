import { lua } from '@astryxdesign/core/CodeBlock/languages/lua';
import type { CodeLanguage } from '@/components/astryx/CodeBlock';
import { java } from '@astryxdesign/core/CodeBlock/languages/java';
import { ruby } from '@astryxdesign/core/CodeBlock/languages/ruby';
import { toml } from '@astryxdesign/core/CodeBlock/languages/toml';
import { thrift } from '@astryxdesign/core/CodeBlock/languages/thrift';
import { graphql } from '@astryxdesign/core/CodeBlock/languages/graphql';
import { dockerfile } from '@astryxdesign/core/CodeBlock/languages/dockerfile';
import { powershell } from '@astryxdesign/core/CodeBlock/languages/powershell';
import { objectiveC } from '@astryxdesign/core/CodeBlock/languages/objective-c';

const languages = new Map(
    Object.entries({
        txt: 'plaintext',
        text: 'plaintext',
        log: 'plaintext',
        js: 'javascript',
        mjs: 'javascript',
        cjs: 'javascript',
        ts: 'typescript',
        mts: 'typescript',
        cts: 'typescript',
        jsx: 'jsx',
        tsx: 'tsx',
        json: 'json',
        html: 'html',
        htm: 'html',
        xml: 'xml',
        svg: 'svg',
        css: 'css',
        scss: 'scss',
        less: 'less',
        py: 'python',
        pyw: 'python',
        sh: 'bash',
        bash: 'bash',
        zsh: 'zsh',
        php: 'php',
        hack: 'hack',
        yaml: 'yaml',
        yml: 'yaml',
        md: 'markdown',
        markdown: 'markdown',
        c: 'c',
        h: 'c',
        cpp: 'cpp',
        cc: 'cpp',
        cxx: 'cpp',
        hpp: 'cpp',
        hh: 'cpp',
        hxx: 'cpp',
        sql: 'sql',
        rs: 'rust',
        kt: 'kotlin',
        kts: 'kotlin',
        swift: 'swift',
        go: 'go',
    })
);

const extraLanguages = [lua, java, ruby, toml, thrift, graphql, dockerfile, objectiveC, powershell];

/** Recognizes text attachments by filename or declared media type without interpreting their contents. */
export function textLanguage(filename: string, mediaType = ''): string | CodeLanguage | undefined {
    const name = filename.replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() ?? '';
    const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';

    // Prefer explicitly imported language grammars and their filename metadata.
    const extra = extraLanguages.find(
        (language) =>
            language.fileExtensions.includes(extension) ||
            language.fileNames.some((file) => file.toLowerCase() === name)
    );

    if (extra) return extra;

    // Resolve built-in language aliases from the final filename extension.
    const language = languages.get(extension);

    if (language) return language;

    // Unknown text formats remain readable without guessing a syntax grammar.
    if (
        mediaType.startsWith('text/') ||
        /^application\/(?:json|xml|yaml|x-yaml|toml|javascript|x-javascript|graphql|x-sh|x-python|x-php|[\w.+-]+\+(?:json|xml))$/.test(
            mediaType
        )
    ) {
        return 'plaintext';
    }

    return undefined;
}
