import { Card } from '@/components/ui/card';

export default function SettingsOrganizations() {
    return (
        <Card className="space-y-3 bg-white/5 p-6">
            <div>
                <h2 className="text-xl font-semibold text-white">
                    Organizations
                </h2>
                <p className="text-sm text-white/60">
                    Manage the organizations connected to your account.
                </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                Organization management tools will appear here.
            </div>
        </Card>
    );
}
