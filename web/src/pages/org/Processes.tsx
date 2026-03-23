import { Workflow } from 'lucide-react';
import Hero from '@/components/longlink/Hero';
import { Card } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

export default function Processes() {
    return (
        <div className="space-y-6">
            <Hero
                title="Processes"
                subtitle="Document and automate the operational flows your teams rely on."
                icon="workflow"
            />

            <Card className="p-10 text-center">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Workflow className="h-5 w-5" />
                        </EmptyMedia>
                        <EmptyTitle>No Processes Yet</EmptyTitle>
                        <EmptyDescription>
                            Processes will surface reusable workflows and
                            playbooks for your organization.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Card>
        </div>
    );
}
