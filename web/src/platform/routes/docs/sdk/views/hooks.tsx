import { Link } from 'react-router';
import ViewLayout from './view-layout';
import { componentDocumentation } from '@/platform/publications';
import { Card, CardHeader, CardTitle } from '@/components/shadcn/card';

/** Links to each View hook reference, with React hooks grouped together. */
export default function HooksPage() {
    return (
        <ViewLayout name="Hooks" toc={[{ id: 'hooks', label: 'Hooks', level: 2 }]}>
            <h2 className="font-semibold tracking-tight text-3xl" id="hooks">
                Hooks
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {componentDocumentation
                    .filter((component) => component.category === 'Hooks')
                    .map((component) => (
                        <Link
                            key={component.slug}
                            to={`/docs/sdk/views/${component.slug}/`}
                            className="min-w-0 outline-offset-4 focus-visible:outline-ring"
                        >
                            <Card size="sm" className="h-full transition-colors hover:bg-muted">
                                <CardHeader>
                                    <CardTitle>{component.label}</CardTitle>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
            </div>
        </ViewLayout>
    );
}
