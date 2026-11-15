import { z } from 'zod';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ArrowUp, CheckCheck, EyeOff, Wrench } from 'lucide-react';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';

export function InviteMember({
    canInviteAdmin,
    onSubmit,
    ...dialogProps
}: DialogProps & { canInviteAdmin: boolean; onSubmit: (data: FormData) => Promise<void> }) {
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

    const submit = useSubmit(
        async (values: z.output<typeof schema>) => {
            const data = new FormData();

            data.append('email', values.email);
            data.append('role', values.role);
            await onSubmit(data);
        },
        { onError: () => form.setError('root', { message: 'Could not send the invitation. Please try again.' }) }
    );

    return (
        <Dialog paddingInline={0} {...dialogProps}>
            <div className="flex h-[min(560px,calc(100dvh-calc(var(--spacing)*10)*4))] min-h-0 min-w-0 overflow-hidden">
                <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
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
                                            <h2 className="font-semibold tracking-tight text-3xl text-center">
                                                Invite user
                                            </h2>
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
                <div className="hidden min-w-0 flex-[0_0_50%] overflow-hidden bg-muted md:flex">
                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                        <img
                            src="/images/invitation.png"
                            alt="Hand-drawn envelopes."
                            className="h-full w-full object-contain invert dark:invert-0"
                            width={1223}
                            height={1286}
                            decoding="async"
                        />
                    </Stack>
                </div>
            </div>
        </Dialog>
    );
}
