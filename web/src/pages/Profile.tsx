import {
    Accessibility,
    Bell,
    KeyRound,
    Mail,
    Palette,
    User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const mainItems = [
    { label: 'Profile', icon: User, active: true },
    { label: 'Appearance', icon: Palette },
    { label: 'Accessibility', icon: Accessibility },
    { label: 'Notifications', icon: Bell },
    { label: 'Emails', icon: Mail },
    { label: 'Password and authentication', icon: KeyRound },
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
            </aside>

            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold">General settings</h2>
                </div>

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
