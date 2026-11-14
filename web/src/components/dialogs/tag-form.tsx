import { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { FormDialog } from './form-dialog';
import { Form } from '@/components/custom/form';
import { Selector } from '@/components/custom/selector';
import { TextInput } from '@/components/custom/text-input';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

export function TagForm({
    base,
    tag,
    onSuccess,
    onCancel
}: {
    base: string;
    tag: z.output<typeof schemas.zOrganizationTagResponse> | null;
    onSuccess: () => Promise<void>;
    onCancel: () => void;
}) {
    async function save(data: FormData) {
        const json = schemas.zOrganizationTagWrite.parse({
            name: z.string().trim().parse(data.get('name')),
            icon: data.get('icon')
        });

        if (tag) {
            await api.patch(`${base}/tags/${tag.id}`, { json });
        } else {
            await api.post(`${base}/tags`, { json });
        }

        await onSuccess();
    }

    return (
        <FormDialog gap={6} onClose={onCancel}>
            <Heading level={2} className="text-center">
                {tag ? 'Edit tab' : 'New tab'}
            </Heading>
            <Form action={save}>
                <Stack gap={3}>
                    <TextInput label="Name" name="name" defaultValue={tag?.name ?? ''} required />
                    <Selector
                        label="Icon"
                        name="icon"
                        defaultValue={tag?.icon ?? 'tag'}
                        options={Object.entries(tabs.icons).map(([value, option]) => ({
                            value,
                            label: option.label,
                            icon: schemas.zTagIcon.parse(value)
                        }))}
                        hasSearch
                        hasClear={false}
                    />
                    <Stack direction="horizontal" gap={2}>
                        <Button label={tag ? 'Save' : 'Create tab'} type="submit" variant="default" />
                        <Button label="Cancel" type="button" variant="ghost" onClick={onCancel} />
                    </Stack>
                </Stack>
            </Form>
        </FormDialog>
    );
}
