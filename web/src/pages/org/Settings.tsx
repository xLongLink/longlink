import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Menu, MenuContent, MenuList, MenuSection } from '@/components/ui/menu';

const settingSections = [
    'General',
    'Identity & Authentication',
    'Access Control (RBAC)',
    'Applications',
    'Infrastructure',
    'Storage',
    'Audit & Compliance',
    'Backups & Recovery',
    'Security',
    'Billing & Plan',
    'API & Integrations',
    'Advanced / System',
] as const;

const toMenuValue = (section: string) =>
    section
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export default function SettingsPage() {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setLogoPreview(URL.createObjectURL(file));
    };

    return (
        <div className="space-y-6">
            <Menu defaultValue={toMenuValue(settingSections[0])}>
                <MenuList>
                    {settingSections.map((section) => (
                        <MenuSection
                            key={section}
                            value={toMenuValue(section)}
                            label={section}
                        />
                    ))}
                </MenuList>

                <div className="space-y-3">
                    {settingSections.map((section) => {
                        const isGeneralSection = section === 'General';

                        return (
                            <MenuContent
                                key={section}
                                value={toMenuValue(section)}
                                className="rounded-xl border border-border bg-card p-4"
                            >
                                <h2 className="text-lg font-semibold">
                                    {section}
                                </h2>

                                {isGeneralSection ? (
                                    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="organization-name">
                                                    Organization name
                                                </Label>
                                                <Input
                                                    id="organization-name"
                                                    defaultValue="LongLink"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="legal-name">
                                                    Legal name
                                                </Label>
                                                <Input
                                                    id="legal-name"
                                                    defaultValue="LongLink Technologies LLC"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tax-id">
                                                    Registration / tax ID
                                                </Label>
                                                <Input
                                                    id="tax-id"
                                                    defaultValue="US-12-3456789"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="primary-contact-email">
                                                    Primary contact email
                                                </Label>
                                                <Input
                                                    id="primary-contact-email"
                                                    type="email"
                                                    defaultValue="contact@longlink.dev"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="support-email">
                                                    Support email
                                                </Label>
                                                <Input
                                                    id="support-email"
                                                    type="email"
                                                    defaultValue="support@longlink.dev"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone-number">
                                                    Phone number
                                                </Label>
                                                <Input
                                                    id="phone-number"
                                                    defaultValue="+1 (415) 555-0138"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="website">
                                                    Website
                                                </Label>
                                                <Input
                                                    id="website"
                                                    defaultValue="https://longlink.dev"
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="physical-address">
                                                    Physical address
                                                </Label>
                                                <Textarea
                                                    id="physical-address"
                                                    defaultValue="548 Market St, PMB 98234&#10;San Francisco, CA 94104&#10;United States"
                                                    rows={4}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-4 rounded-lg border border-border/70 bg-background/30 p-4 text-center">
                                            <div className="text-sm font-semibold">
                                                Organization logo
                                            </div>
                                            <Avatar className="size-32 rounded-xl border border-border/60">
                                                <AvatarImage
                                                    src={logoPreview ?? ''}
                                                    alt="Organization logo"
                                                />
                                                <AvatarFallback className="rounded-xl text-lg">
                                                    LL
                                                </AvatarFallback>
                                            </Avatar>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                                className="gap-2"
                                            >
                                                <ImagePlus className="h-4 w-4" />
                                                Upload logo
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Configure {section.toLowerCase()}{' '}
                                        settings.
                                    </p>
                                )}
                            </MenuContent>
                        );
                    })}
                </div>
            </Menu>
        </div>
    );
}
