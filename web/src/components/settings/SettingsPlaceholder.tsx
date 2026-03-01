import Hero from '@/components/longlink/Hero';

type SettingsPlaceholderProps = {
    title: string;
    subtitle: string;
};

export default function SettingsPlaceholder({
    title,
    subtitle,
}: SettingsPlaceholderProps) {
    return <Hero title={title} subtitle={subtitle} icon="settings" />;
}
