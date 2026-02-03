import { FileText, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const textContent = `ViaVai turns organization knowledge into structured, reusable documentation.
Capture context, highlight decisions, and keep your teams aligned across tools and workflows.`;

export function Text() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Text
                        </h1>
                        <p className="text-sm text-white/60">1 entry</p>
                    </div>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    New Text
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Organization text component</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/70">
                    <p>{textContent}</p>
                    <p className="text-white/60">
                        Use this tab to publish announcements, onboarding
                        guidance, or release notes that should stay visible to
                        every team.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default Text;
