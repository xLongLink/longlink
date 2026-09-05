import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Minimize2, ShieldCheck, Split } from 'lucide-react';

/** Renders the presentation principles. */
export function PrinciplesSlide() {
    return (
        <Stack className="relative" height="100%" width="100%">
            <img
                alt="Human and robot hands reaching toward each other"
                className="w-full -translate-y-4 pointer-events-none select-none object-contain"
                draggable={false}
                src="/images/human-robot-hands.png"
            />
            <Stack className="absolute bottom-16 start-12">
                <Stack gap={8}>
                    <Stack align="center" direction="horizontal" gap={3}>
                        <Minimize2 aria-hidden className="text-accent" size={24} />
                        <Text hasCapsize type="display-3" weight="semibold">
                            Keep it simple
                        </Text>
                    </Stack>
                    <Stack align="center" direction="horizontal" gap={3}>
                        <Split aria-hidden className="text-accent" size={24} />
                        <Text hasCapsize type="display-3" weight="semibold">
                            Separate responsibilities
                        </Text>
                    </Stack>
                    <Stack align="center" direction="horizontal" gap={3}>
                        <ShieldCheck aria-hidden className="text-accent" size={24} />
                        <Text hasCapsize type="display-3" weight="semibold">
                            Own the process
                        </Text>
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );
}
