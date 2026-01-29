import { Plus, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


export function Overview() {

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Overview
                        </h1>
                        <p className="text-sm text-white/60">
                            0 overview
                        </p>
                    </div>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    New Overview
                </Button>
            </div>

            <Card className="p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                    <Sparkles className="h-7 w-7" />
                </div>
                <h2 className="mt-6 text-lg font-semibold">
                    No overview yet
                </h2>
                <p className="mt-2 text-sm text-white/60">
                    This will be the overview of your organization.
                </p>
            </Card>
        </div>
    );
}

export default Overview;
