import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { Bell, Palette, Pencil, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const sectionTitle = {
    profile: 'General settings',
    appearance: 'Appearance preferences',
    notifications: 'Notification preferences',
} as const;

const sectionSubtitle = {
    profile: 'Update your public profile details and avatar.',
    appearance: 'Control how LongLink looks and feels on your devices.',
    notifications: 'Choose how you want to stay informed.',
} as const;

type SectionId = keyof typeof sectionTitle;

const menuItems: Array<{ id: SectionId; label: string; icon: typeof User }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function Profile() {
    const { data: user } = useUser();
    const [activeSection, setActiveSection] = useState<SectionId>('profile');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarUrl = avatarPreview ?? user?.avatar ?? '';
    const avatarFallback = (user?.name ?? 'User').slice(0, 2).toUpperCase();

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
                                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgba(255,255,255,0.75)]'
                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Icon
                                    className={`h-4 w-4 ${
                                        isActive
                                            ? 'text-white'
                                            : 'text-white/70'
                                    }`}
                                />
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
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="profile-email">Email</Label>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    defaultValue="leonardo@longlink.dev"
                                    className="bg-white/5"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="text-sm font-semibold text-white">
                                Profile picture
                            </div>
                            <Avatar className="size-44 border border-white/10">
                                <AvatarImage src={avatarUrl} alt="Profile" />
                                <AvatarFallback>
                                    {avatarFallback}
                                </AvatarFallback>
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
            </section>
        </div>
    );
}
