import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModuleCard } from '@/components/module';

export default function Tools() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Tools
                        </h1>
                        <p className="text-sm text-white/60">2 tools</p>
                    </div>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    New Tools
                </Button>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <ModuleCard
                    name="Accounting"
                    description="Streamline financial operations, manage invoices, and track business expenses in real-time."
                    href="/tools/accounting"
                />
                <ModuleCard
                    name="Workforce"
                    description="Optimize team management, monitor productivity, and coordinate resource allocation."
                    href="/tools/workforce"
                />
            </div>
        </div>
    );
}
