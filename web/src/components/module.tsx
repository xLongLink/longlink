import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ModuleCardProps {
    name: string;
    description: string;
    href: string;
}

export function ModuleCard({ name, description, href }: ModuleCardProps) {
    return (
        <Card className="h-60 flex flex-col">
            <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-end flex-1">
                <Button size="sm" className="w-full cursor-pointer">
                    <a href={href}>Open</a>
                </Button>
            </CardContent>
        </Card>
    );
}
