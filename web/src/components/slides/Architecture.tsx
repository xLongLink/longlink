import { Stack } from '@astryxdesign/core/Stack';
import { TransparentBox } from '@/components/svg/Box';
import {
    Activity,
    ArrowLeftRight,
    Building2,
    Database,
    HardDrive,
    KeyRound,
    Languages,
    Logs,
    Palette,
    Rocket,
    Route,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

const capabilities = [
    { className: 'absolute start-6 top-5', icon: KeyRound, label: 'Identity' },
    { className: 'absolute start-48 top-12', icon: ShieldCheck, label: 'Permissions' },
    { className: 'absolute end-44 top-4', icon: Building2, label: 'Organizations' },
    { className: 'absolute end-8 top-20', icon: Languages, label: 'Translations' },
    { className: 'absolute end-4 top-44', icon: Palette, label: 'Themes' },
    { className: 'absolute start-5 bottom-20', icon: Route, label: 'Routing' },
    { className: 'absolute start-44 bottom-4', icon: Rocket, label: 'Deployment' },
    { className: 'absolute end-48 bottom-12', icon: HardDrive, label: 'Storage' },
    { className: 'absolute end-6 bottom-5', icon: Logs, label: 'Logs' },
    { className: 'absolute start-4 top-44', icon: Activity, label: 'Status' },
] as const;

/** Renders the human-to-Solution-to-database architecture. */
export function ArchitectureSlide() {
    return (
        <Stack className="relative" height={400} width={720}>
            {capabilities.map(({ className, icon: CapabilityIcon, label }) => (
                <CapabilityIcon aria-label={label} className={`${className} text-secondary`} key={label} size={28} />
            ))}
            <Stack align="center" className="absolute inset-0" justify="center">
                <Stack align="center" direction="horizontal" gap={2}>
                    <UserRound aria-hidden className="text-accent" size={64} />
                    <ArrowLeftRight aria-hidden className="text-secondary" size={32} />
                    <TransparentBox aria-hidden="true" height={64} strokeWidth={5} viewBox="96 53 178 178" width={64} />
                    <ArrowLeftRight aria-hidden className="text-secondary" size={32} />
                    <Database aria-hidden className="text-accent" size={64} />
                </Stack>
            </Stack>
        </Stack>
    );
}
