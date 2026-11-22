import { Card } from '@/components/longlink/layout/card';
import { Text } from '@/components/longlink/display/text';
import { useUpdateUser } from '@/platform/hooks/use-user';
import { Stack } from '@/components/longlink/layout/stack';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { Heading } from '@/components/longlink/display/heading';

/** Previews and saves personal appearance without changing any Solution configuration. */
export default function AppearanceSettings() {
    const appearance = useAppearance();
    const userUpdate = useUpdateUser();

    return (
        <Stack gap={6}>
            <Stack gap={3} role="group" aria-label="Theme">
                <Heading level={3} size={4}>
                    Theme
                </Heading>
                <Stack direction="horizontal" wrap="wrap" gap={3}>
                    {(
                        [
                            { value: 'system', label: 'System', image: 'theme_auto.png' },
                            { value: 'light', label: 'Light', image: 'theme_light.png' },
                            { value: 'dark', label: 'Dark', image: 'theme_dark.png' }
                        ] as const
                    ).map(({ value, label, image }) => (
                        <Card
                            key={value}
                            label={label}
                            size="sm"
                            isSelected={appearance.theme === value}
                            isDisabled={userUpdate.isPending}
                            onChange={() => {
                                if (!userUpdate.isPending && appearance.theme !== value)
                                    userUpdate.mutate({ theme: value });
                            }}
                        >
                            <Stack gap={2}>
                                <Text>{label}</Text>
                                <img
                                    src={`/images/${image}`}
                                    alt=""
                                    width={1536}
                                    height={1024}
                                    className="aspect-3/2 w-40 max-w-full rounded-md object-cover"
                                />
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            </Stack>
            {userUpdate.isPending && (
                <Text role="status" size="xs" tone="muted">
                    Saving theme…
                </Text>
            )}
        </Stack>
    );
}
