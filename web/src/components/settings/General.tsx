import { useRef, useState, type ChangeEvent } from 'react';
import Hero from '@/components/longlink/Hero';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function General() {
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
            <Hero
                title="General Settings"
                subtitle="Configure your organization public and legal details"
                icon="settings"
            />

            <Card>
                <CardHeader>
                    <CardTitle>Organization details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="organization-name">
                                Organization name
                            </Label>
                            <Input
                                id="organization-name"
                                defaultValue="Longlink"
                                placeholder="Organization display name"
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="legal-name">Legal name</Label>
                            <Input
                                id="legal-name"
                                placeholder="Registered legal entity name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="registration-tax-id">
                                Registration / tax ID
                            </Label>
                            <Input
                                id="registration-tax-id"
                                placeholder="Company registration or tax ID"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone-number">Phone number</Label>
                            <Input
                                id="phone-number"
                                type="tel"
                                placeholder="+1 (000) 000-0000"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="primary-contact-email">
                                Primary contact email
                            </Label>
                            <Input
                                id="primary-contact-email"
                                type="email"
                                placeholder="contact@company.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="support-email">Support email</Label>
                            <Input
                                id="support-email"
                                type="email"
                                placeholder="support@company.com"
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                type="url"
                                placeholder="https://company.com"
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="physical-address">
                                Physical address
                            </Label>
                            <Textarea
                                id="physical-address"
                                placeholder="Street, city, state, ZIP/postal code, country"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label>Logo</Label>
                        <div className="flex flex-col items-center gap-4 rounded-xl border border-white/10 p-6 text-center">
                            <Avatar className="size-28 rounded-xl border border-white/10">
                                <AvatarImage
                                    src={logoPreview ?? ''}
                                    alt="Logo"
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
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full"
                            >
                                Upload logo
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
