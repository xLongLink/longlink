import { Switch } from '@/components/ui/switch';
import { fromXml, RenderXML } from '@/xml';
import * as monaco from 'monaco-editor';
// @ts-ignore Vite resolves the Monaco editor worker entry at build time.
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// @ts-ignore Vite resolves the Monaco XML language contribution at build time.
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import { useEffect, useMemo, useRef, useState } from 'react';

type MonacoWorkerEnvironment = {
    MonacoEnvironment?: {
        getWorker(_: unknown, label: string): Worker;
    };
};

const monacoGlobal = globalThis as typeof globalThis & MonacoWorkerEnvironment;

monacoGlobal.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
        return new editorWorker();
    },
};

type WindowProps = {
    children: string;
    onRedClick?: () => void;
    onSourceChange?: (xml: string) => void;
    defaultViewMode?: ViewMode;
    sourceEditable?: boolean;
};

type ViewMode = 'rendered' | 'source';

/** Renders a framed XML preview window with a source toggle. */
export function Window({
    children,
    defaultViewMode = 'rendered',
    onRedClick,
    onSourceChange,
    sourceEditable = false,
}: WindowProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
    const sourceXml = normalizeXml(children);
    const sourceEditorRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const onSourceChangeRef = useRef(onSourceChange);
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

    useEffect(() => {
        onSourceChangeRef.current = onSourceChange;
    }, [onSourceChange]);

    useEffect(() => {
        if (viewMode !== 'source' || sourceEditorRef.current == null) {
            return;
        }

        // Create the Monaco editor only while the source pane is visible.
        const editor = monaco.editor.create(sourceEditorRef.current, {
            value: sourceXml,
            language: 'xml',
            theme: 'vs-dark',
            readOnly: !sourceEditable,
            domReadOnly: !sourceEditable,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            fontSize: 14,
            lineNumbers: 'on',
            folding: false,
            contextmenu: false,
            overviewRulerBorder: false,
        });

        editorRef.current = editor;

        const model = editor.getModel();
        const disposable = model
            ? model.onDidChangeContent(() => {
                  if (!sourceEditable || onSourceChangeRef.current == null) {
                      return;
                  }

                  onSourceChangeRef.current(editor.getValue());
              })
            : null;

        return () => {
            disposable?.dispose();
            editorRef.current = null;
            editor.dispose();
        };
    }, [sourceEditable, viewMode]);

    useEffect(() => {
        const editor = editorRef.current;

        if (viewMode !== 'source' || editor == null) {
            return;
        }

        if (editor.getValue() !== sourceXml) {
            editor.setValue(sourceXml);
        }
    }, [sourceXml, viewMode]);

    return (
        <div className="relative h-fit overflow-hidden rounded-2xl border border-border bg-card/80 shadow-lg shadow-black/10 ring-1 ring-border/60">
            <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
                <Switch
                    checked={viewMode === 'rendered'}
                    onCheckedChange={(checked) => setViewMode(checked ? 'rendered' : 'source')}
                />
            </div>

            <div className="absolute right-4 top-3 z-10 flex items-center gap-2">
                <button
                    type="button"
                    aria-label="Clear canvas"
                    onClick={onRedClick}
                    className="h-3 w-3 rounded-full bg-red-400 transition-colors hover:bg-red-300"
                />
                <span className="h-3 w-3 rounded-full bg-orange-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>

            {viewMode === 'rendered' ? (
                <div className="origin-top-left scale-[0.9] w-[111.111%] px-6 pt-12">
                    {parseError ? (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                            {parseError}
                        </div>
                    ) : ast ? (
                        <RenderXML ast={ast} baseUrl="" />
                    ) : null}
                </div>
            ) : (
                <div className="px-3 pt-8 pb-3">
                    <div
                        ref={sourceEditorRef}
                        className="h-[28rem] overflow-hidden rounded-lg border border-border/60"
                    />
                </div>
            )}
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
