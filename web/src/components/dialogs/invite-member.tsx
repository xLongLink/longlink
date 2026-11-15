import { z } from 'zod';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Dialog } from '@/components/custom/native-dialog';
import { Button } from '@/components/longlink/action/button';
import { ArrowUp, CheckCheck, EyeOff, Wrench } from 'lucide-react';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';

export function InviteMember({
    canInviteAdmin,
    onSubmit,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    canInviteAdmin: boolean;
    onSubmit: (data: z.output<typeof schemas.zOrganizationInvitationCreate>) => Promise<void>;
}) {
    const roles = [
        { value: 'read', icon: EyeOff },
        { value: 'write', icon: ArrowUp },
        { value: 'maintain', icon: Wrench },
        ...(canInviteAdmin ? [{ value: 'admin', icon: CheckCheck }] : [])
    ];

    const schema = z.object({
        email: z.email(),
        role: z.enum(canInviteAdmin ? ['read', 'write', 'maintain', 'admin'] : ['read', 'write', 'maintain'])
    });

    const form = useForm<z.input<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: '', role: 'write' }
    });

    const submit = useSubmit(onSubmit, {
        onError: () => form.setError('root', { message: 'Could not send the invitation. Please try again.' })
    });

    return (
        <Dialog {...dialogProps}>
            <DialogContent>
                <div className="flex max-h-[80dvh] min-h-0 min-w-0 overflow-auto">
                    <div className="min-h-0 min-w-0 flex-1">
                        <Stack height="100%" justify="center" width="max-content" maxWidth="100%" className="mx-auto">
                            <form
                                onSubmit={(event) => {
                                    void form.handleSubmit(submit)(event);
                                }}
                                noValidate
                                aria-busy={form.formState.isSubmitting}
                            >
                                <fieldset disabled={form.formState.isSubmitting} className="contents">
                                    <Stack gap={10}>
                                        <Stack gap={2} align="center">
                                            <img
                                                src="/images/organization.png"
                                                alt=""
                                                className="size-20 object-contain invert dark:invert-0"
                                                width={1254}
                                                height={1254}
                                                decoding="async"
                                            />
                                            <Stack gap={0}>
                                                <DialogTitle>Invite user</DialogTitle>
                                                <p className="text-muted-foreground text-center">
                                                    Send an invitation to join this organization.
                                                </p>
                                            </Stack>
                                        </Stack>
                                        <Stack gap={4} width={0} className="min-w-full">
                                            <Controller
                                                name="email"
                                                control={form.control}
                                                render={({ field, fieldState }) => (
                                                    <Field data-invalid={fieldState.invalid}>
                                                        <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                                                        <Input
                                                            {...field}
                                                            id="invite-email"
                                                            type="email"
                                                            placeholder="user@example.com"
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                        <FieldError errors={[fieldState.error]} />
                                                    </Field>
                                                )}
                                            />
                                            <Controller
                                                name="role"
                                                control={form.control}
                                                render={({ field, fieldState }) => (
                                                    <Field data-invalid={fieldState.invalid}>
                                                        <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                                                        <Select
                                                            name={field.name}
                                                            value={field.value}
                                                            onValueChange={(value) => field.onChange(value ?? 'write')}
                                                            disabled={form.formState.isSubmitting}
                                                            items={roles.map(({ value }) => ({ value, label: value }))}
                                                        >
                                                            <SelectTrigger
                                                                ref={field.ref}
                                                                id="invite-role"
                                                                onBlur={field.onBlur}
                                                                aria-invalid={fieldState.invalid}
                                                                className="w-full"
                                                            >
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {roles.map(({ value, icon: Icon }) => (
                                                                    <SelectItem key={value} value={value}>
                                                                        <Icon aria-hidden="true" />
                                                                        {value}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FieldError errors={[fieldState.error]} />
                                                    </Field>
                                                )}
                                            />
                                            <Button type="submit" className="w-full">
                                                Invite
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </fieldset>
                                <FieldError errors={[form.formState.errors.root]} />
                            </form>
                        </Stack>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
