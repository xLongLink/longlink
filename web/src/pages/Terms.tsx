import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';

/** Renders the public terms page. */
export default function Terms() {
    return (
        <main className="mx-auto w-full max-w-[1000px] px-6 py-16">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-3xl text-white">Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-8 text-sm leading-6 text-white/70">
                    <p>
                        These terms govern access to the LongLink platform, associated apps, and shared runtime
                        services.
                    </p>
                    <p>
                        By using the service, you agree to follow the applicable access controls, security requirements,
                        and usage policies defined by the operator.
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
