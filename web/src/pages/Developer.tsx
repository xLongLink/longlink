import { Card } from '@/components/ui/card';

export default function Developer() {
    return (
        <Card className="space-y-3 bg-white/5 p-6">
            <div>
                <h2 className="text-xl font-semibold text-white">Developer</h2>
                <p className="text-sm text-white/60">
                    Configure API keys, webhooks, and developer tools.
                </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                Developer settings will appear here.
            </div>
        </Card>
    );
}
