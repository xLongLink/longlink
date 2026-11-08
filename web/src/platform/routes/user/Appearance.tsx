import { Circle, Check } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { accentColors } from '@/lib/appearance';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useUpdateUser } from '@/lib/hooks/use-user';
import { Heading } from '@astryxdesign/core/Heading';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';

/** Previews and saves personal appearance without changing any Solution configuration. */
export default function AppearanceSettings() {
    const { appearance } = useAppearance();
    const userUpdate = useUpdateUser();

    return (
        <Stack gap={6}>
            <Stack gap={3} role="group" aria-label="Theme">
                <Heading level={4} accessibilityLevel={3}>
                    Theme
                </Heading>
                <Stack direction="horizontal" wrap="wrap" gap={3}>
                    {(
                        [
                            { value: 'system', label: 'System', image: 'theme_auto.png' },
                            { value: 'light', label: 'Light', image: 'theme_light.png' },
                            { value: 'dark', label: 'Dark', image: 'theme_dark.png' },
                        ] as const
                    ).map(({ value, label, image }) => (
                        <SelectableCard
                            key={value}
                            label={label}
                            padding={2}
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
                        </SelectableCard>
                    ))}
                </Stack>
            </Stack>
            <Stack gap={3}>
                <Heading level={4} accessibilityLevel={3}>
                    Appearance
                </Heading>
                <Card>
                    <Stack gap={4}>
                        <Stack gap={2} role="group" aria-label="Accent color">
                            <Text>Accent color</Text>
                            <Stack direction="horizontal" wrap="wrap" gap={2}>
                                {accentColors.map((accent) => (
                                    <Button
                                        key={accent}
                                        label={accent.charAt(0).toUpperCase() + accent.slice(1)}
                                        aria-pressed={appearance.accent === accent}
                                        isDisabled={userUpdate.isPending}
                                        icon={
                                            appearance.accent === accent ? (
                                                <Check size={16} data-accent-swatch={accent} aria-hidden="true" />
                                            ) : (
                                                <Circle
                                                    size={16}
                                                    data-accent-swatch={accent}
                                                    fill="currentColor"
                                                    aria-hidden="true"
                                                />
                                            )
                                        }
                                        onClick={() => {
                                            if (!userUpdate.isPending && appearance.accent !== accent)
                                                userUpdate.mutate({ accent });
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Stack>
                    </Stack>
                </Card>
            </Stack>
            {userUpdate.isPending && (
                <Text type="supporting" color="secondary" role="status">
                    Saving appearance…
                </Text>
            )}
        </Stack>
    );
}
