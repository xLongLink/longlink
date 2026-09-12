import { useState } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import type { OrganizationSummary } from '@/lib/generated/platform-api-v1/types.gen';

/** Edits the Organization's opt-in database hibernation interval. */
export default function DatabaseSettings({
    organization,
    canManage,
    isSaving,
    onSave,
}: {
    organization: OrganizationSummary;
    canManage: boolean;
    isSaving: boolean;
    onSave: (databaseIdleSeconds: number) => Promise<unknown>;
}) {
    const [draft, setDraft] = useState<number | null>(null);
    const toast = useToast();
    const seconds = draft ?? organization.database_idle_seconds;
    const valid = Number.isInteger(seconds) && (seconds === 0 || (seconds >= 300 && seconds <= 604800));

    return (
        <FormLayout>
            <NumberInput
                label="Database idle timeout"
                description="0 keeps the database always on. Set 300 to 604,800 seconds to opt into hibernation. The next request waits for the database to resume."
                units="seconds"
                value={seconds}
                min={0}
                max={604800}
                isIntegerOnly
                isWheelEnabled={false}
                isReadOnly={!canManage}
                isDisabled={isSaving}
                onChange={setDraft}
                status={valid ? undefined : { type: 'error', message: 'Use 0 (always on) or at least 300 seconds.' }}
            />
            {canManage && (
                <Button
                    label="Save database settings"
                    isDisabled={!valid || seconds === organization.database_idle_seconds || isSaving}
                    clickAction={async () => {
                        await onSave(seconds);
                        setDraft(null);
                        toast({ body: 'Database settings saved' });
                    }}
                />
            )}
        </FormLayout>
    );
}
