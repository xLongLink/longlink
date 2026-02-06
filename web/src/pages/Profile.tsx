import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import {
    Accessibility,
    Bell,
    KeyRound,
    Mail,
    Palette,
    Pencil,
    User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const sectionTitle = {
    profile: 'General settings',
    appearance: 'Appearance preferences',
    accessibility: 'Accessibility options',
    notifications: 'Notification preferences',
    emails: 'Email subscriptions',
    password: 'Password and authentication',
} as const;

const sectionSubtitle = {
    profile: 'Update your public profile details and avatar.',
    appearance: 'Control how LongLink looks and feels on your devices.',
    accessibility: 'Adjust focus, contrast, and motion to match your needs.',
    notifications: 'Choose how you want to stay informed.',
    emails: 'Manage the emails and digests you receive.',
    password: 'Secure your account and review authentication.',
} as const;

type SectionId = keyof typeof sectionTitle;

const menuItems: Array<{ id: SectionId; label: string; icon: typeof User }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'emails', label: 'Emails', icon: Mail },
    {
        id: 'password',
        label: 'Password and authentication',
        icon: KeyRound,
    },
];

export default function Profile() {
    const [activeSection, setActiveSection] = useState<SectionId>('profile');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const defaultAvatar =
        'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=200&q=80';

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        setAvatarPreview(URL.createObjectURL(file));
    };

    return (
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-6">
                <div className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => setActiveSection(item.id)}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgba(59,130,246,0.9)]'
                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4 text-white/70" />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </aside>

            <section className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">
                        {sectionTitle[activeSection]}
                    </h2>
                    <p className="text-sm text-white/60">
                        {sectionSubtitle[activeSection]}
                    </p>
                </div>

                {activeSection === 'profile' && (
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="profile-name">Name</Label>
                                <Input
                                    id="profile-name"
                                    defaultValue="Leonardo Saurwein"
                                    className="bg-white/5"
                                />
                                <p className="text-sm text-white/50">
                                    Your name may appear around LongLink where
                                    you contribute or are mentioned.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    defaultValue="ETHZ - Mechanical engineering"
                                    className="min-h-[120px] bg-white/5"
                                />
                                <p className="text-sm text-white/50">
                                    Mention organizations and teammates with @
                                    to link them.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="text-sm font-semibold text-white">
                                Profile picture
                            </div>
                            <Avatar className="size-44 border border-white/10">
                                <AvatarImage
                                    src={avatarPreview ?? defaultAvatar}
                                    alt="Profile"
                                />
                                <AvatarFallback>LS</AvatarFallback>
                            </Avatar>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="gap-2 bg-slate-950/70 text-white hover:bg-slate-900/80"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit photo
                            </Button>
                        </div>
                    </div>
                )}

                {activeSection === 'appearance' && (
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Theme</CardTitle>
                                <CardDescription>
                                    Choose the theme that fits your workspace.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Sync with system
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Automatically switch between light
                                            and dark themes.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Compact mode
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Reduce paddings for dense layouts.
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Display language</CardTitle>
                                <CardDescription>
                                    Select your preferred UI language.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    defaultValue="English (United States)"
                                    className="bg-white/5"
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeSection === 'accessibility' && (
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Motion & focus</CardTitle>
                                <CardDescription>
                                    Reduce animations and enhance focus rings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Reduce motion
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Limit animations throughout the UI.
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Enhanced focus
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Use thicker outlines for focus.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Text size</CardTitle>
                                <CardDescription>
                                    Keep content readable in tight spaces.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    defaultValue="Default (100%)"
                                    className="bg-white/5"
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeSection === 'notifications' && (
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>In-app alerts</CardTitle>
                                <CardDescription>
                                    Decide which events trigger in-app alerts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Mentions & assignments
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Get notified when you are tagged.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Workflow updates
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Alerts for automation status.
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Notification schedule</CardTitle>
                                <CardDescription>
                                    Set quiet hours for alerts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    defaultValue="22:00 - 07:00"
                                    className="bg-white/5"
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeSection === 'emails' && (
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Email digests</CardTitle>
                                <CardDescription>
                                    Control the cadence of summary emails.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Weekly summary
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Overview of projects and tasks.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-medium">
                                            Product updates
                                        </p>
                                        <p className="text-sm text-white/50">
                                            Announcements about new features.
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Primary email</CardTitle>
                                <CardDescription>
                                    Keep your account email up to date.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    defaultValue="leonardo@longlink.dev"
                                    className="bg-white/5"
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeSection === 'password' && (
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Password</CardTitle>
                                <CardDescription>
                                    Update your password regularly to keep your
                                    account secure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">
                                        Current password
                                    </Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        defaultValue="password"
                                        className="bg-white/5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">
                                        New password
                                    </Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        className="bg-white/5"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Two-factor authentication</CardTitle>
                                <CardDescription>
                                    Add an extra layer of protection with 2FA.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium">
                                        Require authentication app
                                    </p>
                                    <p className="text-sm text-white/50">
                                        Use an authenticator when signing in.
                                    </p>
                                </div>
                                <Switch />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </section>
        </div>
    );
}
