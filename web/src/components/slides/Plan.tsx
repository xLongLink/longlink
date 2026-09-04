import { ArrowRight } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the presentation plan slide. */
export function PlanSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <Stack align="center" aria-hidden="true" direction="horizontal" maxWidth={960} width="100%">
                <Stack className="h-1 grow bg-accent-bg" />
                <ArrowRight className="-ms-2 shrink-0 text-accent-bg" size={28} />
            </Stack>
            <Text
                className="ppt-slide-standard-font absolute bottom-12 start-12"
                hasCapsize
                type="large"
                weight="semibold"
            >
                What is the plan?
            </Text>
        </Stack>
    );
}
