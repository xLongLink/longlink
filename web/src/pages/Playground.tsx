import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { fromXml, RenderXML, type ASTNode } from '@/xml';
import { useState } from 'react';

const starterXml = `<longlink>
    <Stack>
        <H1>XML Playground</H1>
        <P>Edit the XML on the left and the preview updates live.</P>
        <Button>Try me</Button>
    </Stack>
</longlink>`;

/** Renders a live XML playground with editable source and preview. */
export default function Playground() {
    const [xml, setXml] = useState(starterXml);

    let ast: ASTNode[] | null = null;
    let parseError: string | null = null;

    try {
        ast = fromXml(xml);
    } catch (error) {
        parseError = error instanceof Error ? error.message : 'Failed to parse XML';
    }

    return (
        <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-[1000px] flex-col gap-6 px-6 py-10">
            <section className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Playground</p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Edit XML and see it render.</h1>
                <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                    Paste LongLink XML into the editor and preview the runtime output immediately.
                </p>
            </section>

            <section className="grid flex-1 gap-4 lg:grid-cols-2">
                <Card className="border-white/10 bg-white/5">
                    <CardHeader className="border-b border-white/10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>XML source</CardTitle>
                                <CardDescription>Type or paste XML here.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setXml(starterXml)}>
                                Reset
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Textarea
                            value={xml}
                            onChange={(event) => setXml(event.target.value)}
                            spellCheck={false}
                            className="min-h-[28rem] resize-none rounded-none border-0 bg-transparent font-mono text-sm leading-6 focus-visible:ring-0"
                        />
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5">
                    <CardHeader className="border-b border-white/10">
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>The rendered XML output appears here.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[28rem] p-4">
                        {parseError ? (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                                {parseError}
                            </div>
                        ) : ast ? (
                            <RenderXML ast={ast} baseUrl="" />
                        ) : null}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
