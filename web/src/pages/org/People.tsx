import { Plus, Users } from 'lucide-react';
import Hero from '@/components/viavai/Hero';
import { Card } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

export default function People() {
    return (
        <div className="space-y-6">
            <Hero
                title="People"
                subtitle="0 people"
                icon="users"
                action="Add Person"
            >
                <Plus className="h-4 w-4" />
            </Hero>

            <Card className="p-10 text-center">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Users className="h-5 w-5" />
                        </EmptyMedia>
                        <EmptyTitle>No People Yet</EmptyTitle>
                        <EmptyDescription>
                            Invite teammates and collaborators to start working
                            together.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Card>
        </div>
    );
}
