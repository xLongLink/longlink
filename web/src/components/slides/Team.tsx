import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Divider } from '@astryxdesign/core/Divider';

/** Renders the presentation team slide. */
export function TeamSlide() {
    return (
        <Stack align="center" className="ppt-slide-standard-font" gap={3}>
            <Text as="h1" hasCapsize type="display-3" weight="semibold">
                Leonardo Saurwein
            </Text>
            <Stack align="center" gap={3}>
                <Text type="large">BSc in Mechanical Engineering at ETHZ</Text>
                <Divider />
                <Stack align="center" gap={1}>
                    <Text color="secondary" type="large">
                        Elegant solutions for complex problems
                    </Text>
                    <Text color="secondary" type="large">
                        Strongly belive in open source
                    </Text>
                </Stack>
            </Stack>
        </Stack>
    );
}
