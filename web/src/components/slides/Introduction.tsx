import { ArrowRight } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the presentation introduction. */
export function IntroductionSlide() {
    return (
        <Stack align="center" direction="horizontal" gap={2}>
            <Text hasCapsize type="display-3" weight="semibold">
                Design
            </Text>
            <ArrowRight aria-hidden className="text-primary" size={24} />
            <Text hasCapsize type="display-3" weight="semibold">
                Build
            </Text>
            <ArrowRight aria-hidden className="text-primary" size={24} />
            <Text hasCapsize type="display-3" weight="semibold">
                Operate
            </Text>
            <ArrowRight aria-hidden className="text-primary" size={24} />
            <Text hasCapsize type="display-3" weight="semibold">
                Improve
            </Text>
        </Stack>
    );
}
