import {
    Accessibility,
    Bell,
    Building2,
    CreditCard,
    Gavel,
    Globe,
    KeyRound,
    Mail,
    Palette,
    Settings as SettingsIcon,
    ShieldCheck,
    User,
    Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const mainItems = [
    { label: 'General', icon: SettingsIcon, active: true },
    { label: 'Profile', icon: User },
    { label: 'Appearance', icon: Palette },
    { label: 'Accessibility', icon: Accessibility },
    { label: 'Notifications', icon: Bell },
];

const accessItems = [
    { label: 'Billing and licensing', icon: CreditCard },
    { label: 'Emails', icon: Mail },
    { label: 'Password and authentication', icon: KeyRound },
    { label: 'Sessions', icon: ShieldCheck },
    { label: 'SSH and GPG keys', icon: KeyRound },
    { label: 'Organizations', icon: Building2 },
    { label: 'Enterprises', icon: Globe },
    { label: 'Teams', icon: Users },
    { label: 'Moderation', icon: Gavel },
];

export default function Profile() {
    return (
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-6">
                <div className="space-y-2">
                    {mainItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                                    item.active
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
                <Separator className="bg-white/10" />
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                        Access
                    </p>
                    <div className="space-y-2">
                        {accessItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
                                >
                                    <Icon className="h-4 w-4 text-white/50" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </aside>

            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold">General settings</h2>
                    <p className="mt-1 text-sm text-white/50">
                        Manage your account preferences and profile details.
                    </p>
                </div>
                <Separator className="bg-white/10" />

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
                                Your name may appear around LongLink where you
                                contribute or are mentioned.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="public-email">Public email</Label>
                            <Select defaultValue="private">
                                <SelectTrigger
                                    id="public-email"
                                    className="bg-white/5"
                                >
                                    <SelectValue placeholder="Select a verified email to display" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="private">
                                        Keep my email private
                                    </SelectItem>
                                    <SelectItem value="hello">
                                        hello@longlink.app
                                    </SelectItem>
                                    <SelectItem value="work">
                                        leonardo@longlink.app
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-white/50">
                                You can update privacy in email settings at any
                                time.
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
                                Mention organizations and teammates with @ to
                                link them.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pronouns">Pronouns</Label>
                            <Select defaultValue="unspecified">
                                <SelectTrigger
                                    id="pronouns"
                                    className="bg-white/5"
                                >
                                    <SelectValue placeholder="Select your pronouns" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unspecified">
                                        Don&apos;t specify
                                    </SelectItem>
                                    <SelectItem value="she">She/Her</SelectItem>
                                    <SelectItem value="he">He/Him</SelectItem>
                                    <SelectItem value="they">
                                        They/Them
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="url">URL</Label>
                            <Input
                                id="url"
                                placeholder="https://your-site.com"
                                className="bg-white/5"
                            />
                        </div>
                    </div>

                    <Card className="flex flex-col items-center gap-4 bg-white/5 p-6 text-center">
                        <div className="text-sm font-semibold text-white">
                            Profile picture
                        </div>
                        <Avatar className="size-36 border border-white/10">
                            <AvatarImage
                                src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=200&q=80"
                                alt="Profile"
                            />
                            <AvatarFallback>LS</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="sm">
                            Edit
                        </Button>
                    </Card>
                </div>
            </section>
        </div>
    );
}
