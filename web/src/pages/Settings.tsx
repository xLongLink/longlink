import Layout from '@/Layout';
import { useUpdateUser, useUser } from '@/hooks/use-user';
import { Button } from '@ui/button';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Menu, MenuSection } from '@ui/menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Bell, Building2, Code2, Paintbrush, Settings2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

const ACCENT_OPTIONS = [
    { value: 'slate', label: 'Slate', swatch: '#64748b' },
    { value: 'gray', label: 'Gray', swatch: '#6b7280' },
    { value: 'zinc', label: 'Zinc', swatch: '#71717a' },
    { value: 'neutral', label: 'Neutral', swatch: '#737373' },
    { value: 'stone', label: 'Stone', swatch: '#78716c' },
    { value: 'red', label: 'Red', swatch: '#ef4444' },
    { value: 'orange', label: 'Orange', swatch: '#f97316' },
    { value: 'amber', label: 'Amber', swatch: '#f59e0b' },
    { value: 'yellow', label: 'Yellow', swatch: '#eab308' },
    { value: 'lime', label: 'Lime', swatch: '#84cc16' },
    { value: 'green', label: 'Green', swatch: '#22c55e' },
    { value: 'emerald', label: 'Emerald', swatch: '#10b981' },
    { value: 'teal', label: 'Teal', swatch: '#14b8a6' },
    { value: 'cyan', label: 'Cyan', swatch: '#06b6d4' },
    { value: 'sky', label: 'Sky', swatch: '#0ea5e9' },
    { value: 'blue', label: 'Blue', swatch: '#3b82f6' },
    { value: 'indigo', label: 'Indigo', swatch: '#6366f1' },
    { value: 'violet', label: 'Violet', swatch: '#8b5cf6' },
    { value: 'purple', label: 'Purple', swatch: '#a855f7' },
    { value: 'fuchsia', label: 'Fuchsia', swatch: '#d946ef' },
    { value: 'pink', label: 'Pink', swatch: '#ec4899' },
    { value: 'rose', label: 'Rose', swatch: '#f43f5e' },
] as const;

type Accent = (typeof ACCENT_OPTIONS)[number]['value'];

const RADIUS_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
] as const;

type Radius = (typeof RADIUS_OPTIONS)[number]['value'];

const THEME_OPTIONS = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
] as const;

type Theme = (typeof THEME_OPTIONS)[number]['value'];

/** Renders the authenticated settings page. */
export default function Settings() {
    const { data: user, isLoading } = useUser();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const organizations = user?.organizations ?? [];
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [accountError, setAccountError] = useState<string | null>(null);

    const theme = user?.theme ?? 'dark';
    const accent = user?.accent ?? 'neutral';
    const radius = user?.radius ?? 'medium';

    // Keep the editable fields aligned with the authenticated user record.
    useEffect(() => {
        if (!user) {
            return;
        }

        setName(user.name);
        setEmail(user.email);
    }, [user]);

    const accountName = name.trim();
    const accountEmail = email.trim();
    const hasAccountChanges =
        !!user &&
        (accountName !== user.name || accountEmail !== user.email) &&
        accountName.length > 0 &&
        accountEmail.length > 0;

    return (
        <Layout tabs={{ Organizations: '/organizations', Settings: '/settings' }}>
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon={<Settings2 />}>
                    <div>
                        <HeroTitle>Settings</HeroTitle>
                        <HeroDescription>Manage your account, preferences, and workspace access.</HeroDescription>
                    </div>
                </Hero>

                <Menu defaultValue="account" className="items-start">
                    <MenuSection value="account" label="Account" icon={UserRound}>
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-foreground">Account</h2>

                            <form
                                className="space-y-4"
                                onSubmit={async (event) => {
                                    event.preventDefault();
                                    setAccountError(null);

                                    if (!user) {
                                        return;
                                    }

                                    const payload: { name?: string; email?: string } = {};

                                    if (accountName !== user.name) {
                                        payload.name = accountName;
                                    }

                                    if (accountEmail !== user.email) {
                                        payload.email = accountEmail;
                                    }

                                    if (!Object.keys(payload).length) {
                                        return;
                                    }

                                    try {
                                        await updateUser(payload);
                                        toast.success('Account settings saved');
                                    } catch (error) {
                                        setAccountError(
                                            error instanceof Error ? error.message : 'Failed to update account'
                                        );
                                    }
                                }}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-name">Username</Label>
                                        <Input
                                            id="settings-name"
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            autoComplete="nickname"
                                            disabled={isLoading || isPending || !user}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-email">Email</Label>
                                        <Input
                                            id="settings-email"
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            autoComplete="email"
                                            disabled={isLoading || isPending || !user}
                                        />
                                    </div>
                                </div>

                                {accountError ? <p className="text-sm text-destructive">{accountError}</p> : null}

                                <div className="flex items-center justify-end gap-3">
                                    <Button type="submit" disabled={!hasAccountChanges || isLoading || isPending}>
                                        {isPending ? 'Saving...' : 'Save changes'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </MenuSection>

                    <MenuSection value="appearance" label="Appearance" icon={Paintbrush}>
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-foreground">Appearance</h2>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Theme</p>
                                    <Select
                                        value={theme}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ theme: value as Theme });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a theme" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {THEME_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Accent color</p>
                                    <Select
                                        value={accent}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ accent: value as Accent });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a color" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACCENT_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="size-2.5 rounded-full"
                                                            style={{ backgroundColor: option.swatch }}
                                                        />
                                                        {option.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Radius</p>
                                    <Select
                                        value={radius}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ radius: value as Radius });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a radius" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RADIUS_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </MenuSection>

                    <MenuSection value="notifications" label="Notifications" icon={Bell}>
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-foreground">Notifications</h2>
                            <p className="text-sm text-muted-foreground">
                                Choose which updates and alerts you want to receive.
                            </p>
                        </div>
                    </MenuSection>

                    <MenuSection value="organizations" label="Organizations" icon={Building2}>
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-foreground">Organizations</h2>
                            <p className="text-sm text-muted-foreground">
                                Review the organizations connected to your personal account.
                            </p>

                            <div className="space-y-2">
                                {organizations.length ? (
                                    organizations.map((organization) => (
                                        <div
                                            key={organization.name}
                                            className="flex items-center justify-between gap-3"
                                        >
                                            <span className="text-sm text-foreground">{organization.name}</span>
                                            <Link to="/organizations" className="text-sm text-accent hover:underline">
                                                Manage
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No organizations available.</p>
                                )}
                            </div>
                        </div>
                    </MenuSection>

                    <MenuSection value="developer-settings" label="Developer Settings" icon={Code2}>
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-foreground">Developer Settings</h2>
                            <p className="text-sm text-muted-foreground">
                                Configure developer access, integrations, and API-related preferences.
                            </p>
                        </div>
                    </MenuSection>
                </Menu>
            </section>
        </Layout>
    );
}
