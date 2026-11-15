import { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { Form } from '@/components/custom/form';
import { Selector } from '@/components/custom/selector';
import { TextInput } from '@/components/custom/text-input';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';

export function TagForm({
    base,
    tag,
    onSuccess,
    onClose,
    ...dialogProps
}: DialogProps & {
    base: string;
    tag: z.output<typeof schemas.zOrganizationTagResponse> | null;
    onSuccess: () => Promise<void>;
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
        <Dialog {...dialogProps} onClose={onClose}>
            <Stack padding={8} minHeight="100%" justify="center" className="shrink-0">
                <Stack gap={6} width="100%" maxWidth={640} className="mx-auto">
                    <h2 className="font-semibold tracking-tight text-3xl text-center">
                        {tag ? 'Edit tab' : 'New tab'}
                    </h2>
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
                                <Button label="Cancel" type="button" variant="ghost" onClick={onClose} />
                            </Stack>
                        </Stack>
                    </Form>
                </Stack>
            </Stack>
        </Dialog>
    );
}
