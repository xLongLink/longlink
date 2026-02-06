import { Plus, Settings } from 'lucide-react';
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

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-200 ring-1 ring-slate-500/30">
                        <Settings className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Settings
                        </h1>
                        <p className="text-sm text-white/60">
                            Organization settings
                        </p>
                    </div>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    New Setting
                </Button>
            </div>

            <Card className="p-10 text-center">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Settings />
                        </EmptyMedia>
                        <EmptyTitle>No Settings Yet</EmptyTitle>
                        <EmptyDescription>
                            Configure organization preferences, access, and
                            policies from here.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center gap-2">
                        <Button>Manage Settings</Button>
                        <Button variant="outline">Review Permissions</Button>
                    </EmptyContent>
                </Empty>
            </Card>
        </div>
    );
}
