import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the human-to-Solution-to-database architecture. */
export function ArchitectureSlide() {
    return (
        <Stack className="relative" height="100%" width="100%">
            <img
                alt="Architecture connecting a user, application core, database, and platform capabilities"
                className="h-full w-full object-contain"
                draggable={false}
                src="/images/architecture.png"
            />
            <Text className="absolute bottom-12 start-12" hasCapsize type="large" weight="semibold">
                Is SaaS dead?
            </Text>
        </Stack>
    );
}
