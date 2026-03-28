import { PanelsTopLeft } from 'lucide-react';
import Hero from '@/longlink/Hero';
import { Card } from '@/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/ui/empty';

export default function Spaces() {
    return (
        <div className="space-y-6">
            <Hero
                title="Spaces"
                subtitle="Create dedicated work areas for teams, projects, and context."
                icon="panels-top-left"
            />

            <Card className="p-10 text-center">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <PanelsTopLeft className="h-5 w-5" />
                        </EmptyMedia>
                        <EmptyTitle>No Spaces Yet</EmptyTitle>
                        <EmptyDescription>
                            Spaces will help organize work into focused
                            environments for your organization.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Card>
        </div>
    );
}
