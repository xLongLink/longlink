import { Plus, Settings } from 'lucide-react';
import Hero from '@/components/viavai/Hero';
import { Card } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Hero
                title="Settings"
                subtitle="Organization settings"
                icon="settings"
                action="New Setting"
            >
                <Plus className="h-4 w-4" />
            </Hero>

            <Card className="p-10 text-center">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Settings className="h-5 w-5" />
                        </EmptyMedia>
                        <EmptyTitle>No Settings Yet</EmptyTitle>
                        <EmptyDescription>
                            Configure organization preferences, access, and
                            policies from here.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Card>
        </div>
    );
}
