import { z } from 'zod';
import { api } from '@/lib/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import * as permissions from '@/platform/permissions';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { ArrowUp, CheckCheck, EyeOff, Wrench } from 'lucide-react';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';

export function InviteMember({
    base,
    canInviteAdmin,
    onSettled,
    onOpenChange
}: {
    base: string;
    onOpenChange: (open: boolean) => void;
    canInviteAdmin: boolean;
    onSettled: () => Promise<void>;
}) {
    const roleSchema = canInviteAdmin
        ? permissions.assignableRoleSchema
        : permissions.assignableRoleSchema.exclude(['admin']);
    const roles = roleSchema.options.map((value) => ({
        value,
        icon: { read: EyeOff, write: ArrowUp, maintain: Wrench, admin: CheckCheck }[value]
    }));

    const schema = schemas.zOrganizationInvitationCreate.extend({
        email: z.string().trim().pipe(schemas.zOrganizationInvitationCreate.shape.email),
        role: roleSchema
    });

    const form = useForm<z.input<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: '', role: 'write' }
    });

    async function inviteMember(data: z.output<typeof schema>) {
        try {
            await api.post(`${base}/invitations`, { json: data });
            onOpenChange(false);
        } finally {
            // Failed email delivery can still persist the invitation.
            await onSettled();
        }
    }

    const submit = useSubmit(inviteMember, {
        onError: () => form.setError('root', { message: 'Could not send the invitation. Please try again.' })
    });

    return (
        <Dialog open onOpenChange={onOpenChange} title="Invite user" showHeader={false} bodyPadding={false}>
            <form
                className="grid min-h-full grid-cols-1 items-center sm:grid-cols-2"
                onSubmit={form.handleSubmit(submit)}
                noValidate
                aria-busy={form.formState.isSubmitting}
            >
                <fieldset disabled={form.formState.isSubmitting} className="flex min-w-0 flex-col gap-4 border-0 p-6">
                    <Heading level={2} size={4} align="center">
                        Invite user
                    </Heading>
                    <Field data-invalid={Boolean(form.formState.errors.email)}>
                        <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                        <Input
                            {...form.register('email')}
                            id="invite-email"
                            type="email"
                            placeholder="user@example.com"
                            aria-invalid={Boolean(form.formState.errors.email)}
                        />
                        <FieldError errors={[form.formState.errors.email]} />
                    </Field>
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
                    <FieldError errors={[form.formState.errors.root]} />
                    <div className="flex items-center justify-between gap-2">
                        <Button type="button" variant="link" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Invite</Button>
                    </div>
                </fieldset>
                <div className="flex h-full items-center justify-center bg-black/10 p-6 dark:bg-black/20">
                    <img
                        src="/images/organization.png"
                        alt=""
                        width={1254}
                        height={1254}
                        decoding="async"
                        className="w-full max-w-72 object-contain invert dark:invert-0"
                    />
                </div>
            </form>
        </Dialog>
    );
}
