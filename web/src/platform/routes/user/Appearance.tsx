import { api } from '@/lib/api';
import { useState } from 'react';
import { useApiError } from '@/lib/errors';
import { Circle, Check } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useQueryClient } from '@tanstack/react-query';
import { useAppearance } from '@/components/Appearance';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';
import { accentColors, appearanceSchema, type Appearance } from '@/lib/appearance';

/** Previews and saves personal appearance without changing any Solution configuration. */
export default function AppearanceSettings() {
    const { appearance, setAppearance } = useAppearance();
    const [saving, setSaving] = useState(false);
    const queryClient = useQueryClient();
    const reportError = useApiError();

    /** Serializes changes and restores the previous preference when saving fails. */
    async function saveAppearance(next: Appearance) {
        if (saving || (next.theme === appearance.theme && next.accent === appearance.accent)) return;
        const previous = appearance;
        setAppearance(next);
        setSaving(true);

        try {
            await queryClient.cancelQueries({ queryKey: ['api', '/api/v1/me'], exact: true });
            const user = await api.patch('/api/v1/me', { json: next }).json(zCurrentUser);
            await queryClient.cancelQueries({ queryKey: ['api', '/api/v1/me'], exact: true });
            queryClient.setQueryData(['api', '/api/v1/me'], user);
        } catch (error) {
            setAppearance(previous);
            reportError(error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Stack gap={6}>
            <Stack gap={3} role="group" aria-label="Theme">
                <Heading level={4} accessibilityLevel={3}>
                    Theme
                </Heading>
                <Stack direction="horizontal" wrap="wrap" gap={3}>
                    {[
                        { value: 'system', label: 'System', image: 'theme_auto.png' },
                        { value: 'light', label: 'Light', image: 'theme_light.png' },
                        { value: 'dark', label: 'Dark', image: 'theme_dark.png' },
                    ].map(({ value, label, image }) => (
                        <SelectableCard
                            key={value}
                            label={label}
                            padding={2}
                            isSelected={appearance.theme === value}
                            isDisabled={saving}
                            onChange={() =>
                                void saveAppearance(appearanceSchema.parse({ ...appearance, theme: value }))
                            }
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
                    <Stack gap={2} role="group" aria-label="Accent color">
                        <Text>Accent color</Text>
                        <Stack direction="horizontal" wrap="wrap" gap={2}>
                            {accentColors.map((accent) => (
                                <Button
                                    key={accent}
                                    label={accent.charAt(0).toUpperCase() + accent.slice(1)}
                                    aria-pressed={appearance.accent === accent}
                                    isDisabled={saving}
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
                                    onClick={() => void saveAppearance({ ...appearance, accent })}
                                />
                            ))}
                        </Stack>
                    </Stack>
                </Card>
            </Stack>
            {saving && (
                <Text type="supporting" color="secondary" role="status">
                    Saving appearance…
                </Text>
            )}
        </Stack>
    );
}
