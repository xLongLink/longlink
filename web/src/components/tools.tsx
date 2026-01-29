import { Plus, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


export function Tools() {
    const tools = [
        { id: 1, name: 'sample' },
        { id: 2, name: 'test' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Tools
                        </h1>
                        <p className="text-sm text-white/60">
                            {tools.length} tools
                        </p>
                    </div>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    New Tools
                </Button>
            </div>

            <div className="grid gap-4">
                {tools.map(tool => (
                    <Card key={tool.id} className="p-6">
                        <h3 className="font-semibold text-white">{tool.name}</h3>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default Tools;
