import { useEffect, useState } from 'react';
import Hero from '@/longlink/Hero';
import Input from '@/longlink/Input';
import { apiFetch } from '@/lib/api';

type OrganizationSettingsState = {
    organizationName: string;
    legalName: string;
    registrationTaxId: string;
    phoneNumber: string;
    primaryContactEmail: string;
    supportEmail: string;
    website: string;
    physicalAddress: string;
};

const INITIAL_SETTINGS: OrganizationSettingsState = {
    organizationName: '',
    legalName: '',
    registrationTaxId: '',
    phoneNumber: '',
    primaryContactEmail: '',
    supportEmail: '',
    website: '',
    physicalAddress: '',
};

const ORGANIZATION_SETTING_KEYS = {
    organizationName: 'ORG_NAME',
    legalName: 'ORG_NAME_LEGAL',
    registrationTaxId: 'ORG_TAX_ID',
    phoneNumber: 'ORG_PHONE',
    primaryContactEmail: 'ORG_MAIL_CONTACT',
    supportEmail: 'ORG_MAIL_SUPPORT',
    website: 'ORG_WEBSITE',
    physicalAddress: 'ORG_ADDRESS',
} as const;

type SettingResponse = {
    key: string;
    value: string;
    app_id: number | null;
};

export default function General() {
    const [settings, setSettings] =
        useState<OrganizationSettingsState>(INITIAL_SETTINGS);

    useEffect(() => {
        const loadSettings = async () => {
            const nextSettings: OrganizationSettingsState = {
                ...INITIAL_SETTINGS,
            };

            const settingEntries = Object.entries(ORGANIZATION_SETTING_KEYS);

            await Promise.all(
                settingEntries.map(async ([stateKey, settingKey]) => {
                    try {
                        const response = await apiFetch<SettingResponse>(
                            `/settings/${settingKey}`
                        );
                        nextSettings[
                            stateKey as keyof OrganizationSettingsState
                        ] = response.value;
                    } catch {
                        nextSettings[
                            stateKey as keyof OrganizationSettingsState
                        ] = '';
                    }
                })
            );

            setSettings(nextSettings);
        };

        void loadSettings();
    }, []);

    return (
        <div className="space-y-6">
            <Hero
                title="Organization Settings"
                subtitle="Configure your organization public and legal details"
                icon="settings"
            />

            <section className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        label="Organization name"
                        value={settings.organizationName}
                        placeholder="Organization display name"
                        submit={`/settings/${ORGANIZATION_SETTING_KEYS.organizationName}`}
                    />

                    <Input
                        label="Legal name"
                        value={settings.legalName}
                        placeholder="Registered legal entity name"
                        submit={`/settings/${ORGANIZATION_SETTING_KEYS.legalName}`}
                    />

                    <Input
                        label="Registration / tax ID"
                        value={settings.registrationTaxId}
                        placeholder="Company registration or tax ID"
                        submit={`/settings/${ORGANIZATION_SETTING_KEYS.registrationTaxId}`}
                    />

                    <Input
                        label="Phone number"
                        value={settings.phoneNumber}
                        placeholder="+1 (000) 000-0000"
                        submit={`/settings/${ORGANIZATION_SETTING_KEYS.phoneNumber}`}
                    />

                    <Input
                        label="Primary contact email"
                        value={settings.primaryContactEmail}
                        placeholder="contact@company.com"
                        submit={`/settings/${ORGANIZATION_SETTING_KEYS.primaryContactEmail}`}
                    />

                    <Input
                        label="Support email"
                        value={settings.supportEmail}
                        placeholder="support@company.com"
                        submit={`/settings/${ORGANIZATION_SETTING_KEYS.supportEmail}`}
                    />

                    <div className="sm:col-span-2">
                        <Input
                            label="Website"
                            value={settings.website}
                            placeholder="https://company.com"
                            submit={`/settings/${ORGANIZATION_SETTING_KEYS.website}`}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Input
                            label="Physical address"
                            value={settings.physicalAddress}
                            kind="textarea"
                            placeholder="Street, city, state, ZIP/postal code, country"
                            submit={`/settings/${ORGANIZATION_SETTING_KEYS.physicalAddress}`}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
