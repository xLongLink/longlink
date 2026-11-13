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
        lua: 'lua',
        java: 'java',
        rb: 'ruby',
        rake: 'ruby',
        gemspec: 'ruby',
        toml: 'toml',
        thrift: 'thrift',
        graphql: 'graphql',
        gql: 'graphql',
        dockerfile: 'dockerfile',
        m: 'objective-c',
        mm: 'objective-c',
        ps1: 'powershell',
        psm1: 'powershell',
        psd1: 'powershell',
    })
);

const filenames = new Map([
    ['gemfile', 'ruby'],
    ['rakefile', 'ruby'],
    ['dockerfile', 'dockerfile'],
    ['containerfile', 'dockerfile'],
]);

/** Recognizes text attachments by filename or declared media type without interpreting their contents. */
export function textLanguage(filename: string, mediaType = ''): string | undefined {
    const name = filename.replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() ?? '';
    const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';

    // Recognize named source files and extensions without loading renderer-owned grammars.
    const language = filenames.get(name) ?? languages.get(extension);

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
