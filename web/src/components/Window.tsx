import { useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { fromXml, RenderXML } from '@/xml';

type WindowProps = {
    children: string;
    onRedClick?: () => void;
};

type ViewMode = 'rendered' | 'source';

/** Renders a framed XML preview window with a source toggle. */
export function Window({ children, onRedClick }: WindowProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('rendered');
    const sourceXml = normalizeXml(children);
    const { ast, parseError } = useMemo(() => {
        const documentXml = wrapWindowXml(sourceXml);

        try {
            return { ast: fromXml(documentXml), parseError: null as string | null };
        } catch (error) {
            return {
                ast: null,
                parseError: error instanceof Error ? error.message : 'Failed to parse XML',
            };
        }
    }, [sourceXml]);

    return (
        <div className="relative h-full min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-card/80 shadow-lg shadow-black/10 ring-1 ring-border/60">
            <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
                <button
                    type="button"
                    aria-label="Clear canvas"
                    onClick={onRedClick}
                    className="h-3 w-3 rounded-full bg-red-400 transition-colors hover:bg-red-300"
                />
                <span className="h-3 w-3 rounded-full bg-orange-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>

            <div className="absolute right-4 top-3 z-10 flex items-center gap-2">
                <Switch checked={viewMode === 'rendered'} onCheckedChange={(checked) => setViewMode(checked ? 'rendered' : 'source')} />
            </div>

            <div className="origin-top-left scale-[0.9] w-[111.111%] px-6 pt-10">
                {viewMode === 'rendered' ? (
                    parseError ? (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                            {parseError}
                        </div>
                    ) : ast ? (
                        <RenderXML ast={ast} baseUrl="" />
                    ) : null
                ) : (
                    <pre className="overflow-auto whitespace-pre-wrap font-mono text-sm leading-6 text-foreground">{sourceXml}</pre>
                )}
            </div>
        </div>
    );
}

/** Wraps fragments in a LongLink root before parsing. */
function wrapWindowXml(xml: string): string {
    const trimmedXml = xml.trim();

    if (!trimmedXml) {
        return '<longlink></longlink>';
    }

    if (/^<longlink(?:\s|>|\/)/i.test(trimmedXml)) {
        return xml;
    }

    return `<longlink>\n${xml}\n</longlink>`;
}

/** Removes shared indentation from multiline XML snippets. */
function normalizeXml(xml: string): string {
    const lines = xml.replace(/\r\n/g, '\n').split('\n');

    while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
    }

    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }

    let indent = Number.POSITIVE_INFINITY;

    for (const line of lines) {
        if (line.trim() === '') {
            continue;
        }

        const match = line.match(/^\s*/);
        indent = Math.min(indent, match ? match[0].length : 0);
    }

    if (!Number.isFinite(indent) || indent === 0) {
        return lines.join('\n');
    }

    return lines.map((line) => (line.length >= indent ? line.slice(indent) : line.trimStart())).join('\n');
}
