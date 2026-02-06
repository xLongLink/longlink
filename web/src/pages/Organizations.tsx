import { Building2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

export default function Organizations() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Organizations
                        </h2>
                        <p className="text-sm text-white/60">0 organizations</p>
                    </div>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    New Organization
                </Button>
            </div>

            <Card className="p-10 text-center">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Building2 />
                        </EmptyMedia>
                        <EmptyTitle>No Organizations Yet</EmptyTitle>
                        <EmptyDescription>
                            Create or join an organization to start managing
                            your workspaces and projects.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center gap-2">
                        <Button>Create Organization</Button>
                        <Button variant="outline">Join Organization</Button>
                    </EmptyContent>
                </Empty>
            </Card>
        </div>
    );
}
