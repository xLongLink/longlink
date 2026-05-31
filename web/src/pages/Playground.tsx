import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Window } from '@/components/Window';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

const exampleFiles = {
    Text: '/examples/text.xml',
    State: '/examples/state.xml',
    If: '/examples/if.xml',
    For: '/examples/for.xml',
    Form: '/examples/form.xml',
    Quote: '/examples/quote.xml',
    Menu: '/examples/menu.xml',
    Cart: '/examples/cart.xml',
} as const;

type ExampleName = keyof typeof exampleFiles;
type ExampleMap = Record<ExampleName, string>;

type SelectedExample = ExampleName | null;

/** Renders a live XML playground page. */
export default function Playground() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const xmlParam = searchParams.get('xml');
    const initialXml = unwrapPlaygroundXml(xmlParam ?? '');
    const [examples, setExamples] = useState<ExampleMap>({} as ExampleMap);
    const [xml, setXml] = useState<string>(initialXml);
    const [selectedExample, setSelectedExample] = useState<SelectedExample>(xmlParam ? null : 'Text');
    const activeXml = selectedExample ? (examples[selectedExample] ?? xml) : xml;

    useEffect(() => {
        if (!xmlParam) {
            return;
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('xml');

        navigate({ search: nextSearchParams.toString() ? `?${nextSearchParams.toString()}` : '' }, { replace: true });
    }, [navigate, searchParams, xmlParam]);

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
        };

        void loadExamples().catch(() => {
            // Keep the inline fallback if the static files are unavailable.
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="min-h-screen text-foreground">
            <Navbar />

            <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-[1000px] flex-col gap-3 px-6 pt-3 pb-6">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(examples).map(([label, exampleXml]) => (
                            <Badge
                                key={label}
                                variant={selectedExample === label ? 'default' : 'outline'}
                                className="cursor-pointer select-none"
                                onClick={() => {
                                    setSelectedExample(label as ExampleName);
                                    setXml(exampleXml);
                                }}
                            >
                                {label}
                            </Badge>
                        ))}
                    </div>
                </section>

                <section className="flex-1">
                    <Window
                        onRedClick={() => {
                            setSelectedExample(null);
                            setXml('');
                        }}
                    >
                        {activeXml}
                    </Window>
                </section>
            </main>

            <Footer />
        </div>
    );
}

/** Removes a wrapping <longlink> document element from playground XML. */
function unwrapPlaygroundXml(xml: string): string {
    const trimmedXml = xml.trim();
    const match = trimmedXml.match(/^<longlink(?:\s[^>]*)?>([\s\S]*)<\/longlink>$/i);

    if (!match) {
        return xml;
    }

    return match[1].trim();
}
