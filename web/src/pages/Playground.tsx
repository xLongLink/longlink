import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { fromXml, RenderXML, type ASTNode } from '@/xml';
import { useEffect, useState } from 'react';

const exampleFiles = {
    Text: '/examples/text.xml',
    Form: '/examples/form.xml',
    Quote: '/examples/quote.xml',
    Menu: '/examples/menu.xml',
    Cart: '/examples/cart.xml',
} as const;

type ExampleName = keyof typeof exampleFiles;
type ExampleMap = Record<ExampleName, string>;

const starterXml = `<longlink>
    <State id="volume" value="[65]" />
    <FieldSet>
        <FieldLegend>Playback settings</FieldLegend>
        <FieldDescription>Use the slider to preview the rendered state by default.</FieldDescription>
        <FieldGroup>
            <Field>
                <FieldLabel htmlFor="volume">Volume</FieldLabel>
                <Slider id="volume" value="$volume" min="0" max="100" step="5" />
                <P>Current volume: ${'${'}volume.value}</P>
            </Field>
        </FieldGroup>
    </FieldSet>
</longlink>`;

const starterExamples: ExampleMap = {
    Text: starterXml,
    Form: starterXml,
    Quote: starterXml,
    Menu: starterXml,
    Cart: starterXml,
};

type ViewMode = 'code' | 'rendered';

/** Renders a live XML playground with editable source and preview. */
export default function Playground() {
    const [examples, setExamples] = useState<ExampleMap>(starterExamples);
    const [xml, setXml] = useState<string>(starterXml);
    const [viewMode, setViewMode] = useState<ViewMode>('rendered');

    useEffect(() => {
        let cancelled = false;

        // Load the public XML snapshots so the presets stay aligned with the docs.
        const loadExamples = async () => {
            const entries = await Promise.all(
                Object.entries(exampleFiles).map(async ([label, path]) => {
                    const response = await fetch(path);

                    if (!response.ok) {
                        throw new Error(`Failed to load ${path}`);
                    }

                    return [label, await response.text()] as const;
                })
            );

            if (cancelled) {
                return;
            }

            const nextExamples = Object.fromEntries(entries) as ExampleMap;
            setExamples(nextExamples);
            setXml((current) => (current === starterXml ? nextExamples.Text : current));
        };

        void loadExamples().catch(() => {
            // Keep the inline fallback if the static files are unavailable.
        });

        return () => {
            cancelled = true;
        };
    }, []);

    let ast: ASTNode[] | null = null;
    let parseError: string | null = null;

    try {
        ast = fromXml(xml);
    } catch (error) {
        parseError = error instanceof Error ? error.message : 'Failed to parse XML';
    }

    return (
        <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-[1000px] flex-col gap-3 px-6 pt-3 pb-6">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(examples).map(([label, exampleXml]) => (
                        <Badge
                            key={label}
                            variant={xml === exampleXml ? 'secondary' : 'outline'}
                            className="cursor-pointer select-none"
                            onClick={() => setXml(exampleXml)}
                        >
                            {label}
                        </Badge>
                    ))}
                </div>
            </section>

            <section className="flex-1">
                <div className="relative h-full min-h-[28rem] overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 ring-1 ring-white/5">
                    <div className="origin-top-left scale-[0.9] w-[111.111%] px-6">
                        <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
                            <button
                                type="button"
                                aria-label="Clear canvas"
                                onClick={() => setXml('')}
                                className="h-3 w-3 rounded-full bg-red-400 transition-colors hover:bg-red-300"
                            />
                            <span className="h-3 w-3 rounded-full bg-yellow-400" />
                            <span className="h-3 w-3 rounded-full bg-green-400" />
                        </div>

                        <div className="absolute right-4 top-3 z-10 flex items-center gap-2">
                            <Switch
                                checked={viewMode === 'rendered'}
                                onCheckedChange={(checked) => setViewMode(checked ? 'rendered' : 'code')}
                            />
                        </div>

                        <div className="pt-10">
                            {viewMode === 'code' ? (
                                <Textarea
                                    value={xml}
                                    onChange={(event) => setXml(event.target.value)}
                                    spellCheck={false}
                                    className="min-h-[28rem] resize-none rounded-none border-0 bg-transparent font-mono text-sm leading-6 focus-visible:ring-0"
                                />
                            ) : parseError ? (
                                <div className="min-h-[28rem] p-4">
                                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                                        {parseError}
                                    </div>
                                </div>
                            ) : ast ? (
                                <div className="min-h-[28rem] p-4">
                                    <RenderXML ast={ast} baseUrl="" />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
