import { Plus, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

export default function Workflows() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Workflows
                        </h1>
                        <p className="text-sm text-white/60">0 workflows</p>
                    </div>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    New Workflow
                </Button>
            </div>

            <Card className="p-10 text-center">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Sparkles />
                        </EmptyMedia>
                        <EmptyTitle>No Workflows Yet</EmptyTitle>
                        <EmptyDescription>
                            You haven&apos;t created any workflows yet. Get
                            started by creating your first workflow.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Card>
        </div>
    );
}
