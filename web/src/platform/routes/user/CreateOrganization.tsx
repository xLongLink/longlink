import { api } from '@/lib/api';
import { useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';

/** Owns the creation draft and refreshes memberships after a successful request. */
export default function CreateOrganization({
    isOpen,
    onOpenChange,
    invalidate,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    invalidate: () => Promise<void>;
}) {
    const [name, setName] = useState('');

    /** Creates the organization and refreshes its memberships. */
    async function createOrganization() {
        if (!name.trim()) return;

        // Close only after creation and the membership refresh succeed.
        await api.post('/api/v1/organizations', { json: zOrganizationCreate.parse({ name: name.trim() }) });
        await invalidate();
        onOpenChange(false);
    }

    return (
        <Dialog isOpen={isOpen} purpose="form" onOpenChange={onOpenChange}>
            <DialogHeader
                title="New organization"
                onOpenChange={() => {
                    onOpenChange(false);
                }}
            />
            <form action={createOrganization}>
                <Stack gap={3}>
                    <TextInput label="Name" value={name} placeholder="Example LongLink" isRequired onChange={setName} />
                    <Button label="Create organization" variant="primary" type="submit" isDisabled={!name.trim()} />
                </Stack>
            </form>
        </Dialog>
    );
}
