import { api } from '@/lib/api';
import { useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import type { useAction } from '@/lib/hooks/use-api';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';

/** Owns the creation draft while the parent coordinates page-wide actions. */
export default function CreateOrganization({
    isOpen,
    onOpenChange,
    action,
    invalidate,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    action: ReturnType<typeof useAction>;
    invalidate: () => Promise<void>;
}) {
    const [name, setName] = useState('');

    // Preserve the parent's pending guards for all actions, not just creation.
    return (
        <Dialog
            isOpen={isOpen}
            purpose="form"
            onOpenChange={(open) => {
                if (!action.isPending) onOpenChange(open);
            }}
        >
            <DialogHeader
                title="New organization"
                onOpenChange={() => {
                    if (!action.isPending) onOpenChange(false);
                }}
            />
            <Stack
                gap={3}
                as="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (action.isPending || !name.trim()) return;

                    // Preserve the draft on failure and close only after memberships refresh.
                    action.mutate(async () => {
                        await api.post('/api/v1/organizations', {
                            json: zOrganizationCreate.parse({ name: name.trim() }),
                        });
                        await invalidate();
                        onOpenChange(false);
                    });
                }}
            >
                <TextInput label="Name" value={name} placeholder="Example LongLink" isRequired onChange={setName} />
                <Button
                    label="Create organization"
                    variant="primary"
                    type="submit"
                    isDisabled={!name.trim()}
                    isLoading={action.isPending}
                />
            </Stack>
        </Dialog>
    );
}
