import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { TransparentBox } from '@/components/svg/Box';
import { ArrowRight, Database, UserRound } from 'lucide-react';

/** Renders the human-to-Solution-to-database architecture. */
export function ArchitectureSlide() {
    return (
        <Card padding={6} width={720}>
            <Stack align="center" direction="horizontal" gap={4} justify="center" paddingBlock={6}>
                <Stack align="center" width={160}>
                    <UserRound aria-hidden className="text-accent" size={64} />
                </Stack>
                <ArrowRight aria-hidden className="text-secondary" size={32} />
                <Stack align="center" width={160}>
                    <TransparentBox aria-hidden="true" height={64} strokeWidth={5} viewBox="96 53 178 178" width={64} />
                </Stack>
                <ArrowRight aria-hidden className="text-secondary" size={32} />
                <Stack align="center" width={160}>
                    <Database aria-hidden className="text-accent" size={64} />
                </Stack>
            </Stack>
        </Card>
    );
}
