import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/components/ui/button-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { Input } from '@/components/ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
} from '@/components/ui/input-group';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverHeader, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateUser, useUser } from '@/hooks/use-user';
import { ACCENT_OPTIONS, RADIUS_OPTIONS, resolveTheme, THEME_OPTIONS, THEME_PRESETS, type Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Paintbrush } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';

type ThemeDraft = {
    theme: Theme;
    accent: (typeof ACCENT_OPTIONS)[number]['value'];
    radius: (typeof RADIUS_OPTIONS)[number]['value'];
};

/** Returns a readable text color for a hex swatch. */
function getContrastColor(hex: string) {
    const normalized = hex.replace('#', '');
    const expanded =
        normalized.length === 3
            ? normalized
                  .split('')
                  .map((part) => `${part}${part}`)
                  .join('')
            : normalized;
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);

    // Use a small luminance check so preview chips stay readable against any accent swatch.
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

    return luminance > 0.62 ? '#0f172a' : '#f8fafc';
}

/** Renders the theme showcase page with live theme controls. */
export default function Theme() {
    const { user, theme, accent, radius, isLoading } = useUser();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const [draft, setDraft] = useState<ThemeDraft>({ theme, accent, radius });
    const [themeDialogOpen, setThemeDialogOpen] = useState(false);
    useEffect(() => {
        setDraft({ theme, accent, radius });
    }, [theme, accent, radius]);

    const resolvedTheme = resolveTheme(draft.theme);
    const themePreset = THEME_PRESETS[resolvedTheme];
    const accentSwatch = ACCENT_OPTIONS.find((option) => option.value === draft.accent)?.swatch ?? '#71717a';
    const accentForeground = getContrastColor(accentSwatch);
    const previewStyle = {
        '--background': themePreset.background,
        '--foreground': themePreset.primary,
        '--muted-foreground': themePreset.muted,
        '--accent': accentSwatch,
        '--primary': accentSwatch,
        '--accent-foreground': accentForeground,
        '--primary-foreground': accentForeground,
        '--radius':
            draft.radius === 'none'
                ? '0rem'
                : draft.radius === 'small'
                  ? '0.125rem'
                  : draft.radius === 'medium'
                    ? '0.25rem'
                    : '0.5rem',
    } as CSSProperties;

    return (
        <div className="min-h-screen overflow-hidden bg-background text-foreground">
            <main className="relative px-6 py-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
                    <Hero icon={<Paintbrush />}>
                        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <HeroTitle>Theme</HeroTitle>
                                <HeroDescription>
                                    Preview the color palette, radius, and shared controls in one place.
                                </HeroDescription>
                            </div>

                            <HeroAction>
                                <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
                                    <DialogTrigger
                                        className={cn(
                                            buttonVariants({ variant: 'outline', size: 'sm' }),
                                            'justify-center'
                                        )}
                                    >
                                        Change theme
                                    </DialogTrigger>
                                    <DialogContent>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <DialogTitle>Theme mode</DialogTitle>
                                                <DialogDescription>
                                                    Adjust the theme, accent, and radius for the showcase preview.
                                                </DialogDescription>
                                            </div>

                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="theme-dialog-theme">Theme</Label>
                                                    <Select
                                                        value={draft.theme}
                                                        disabled={isLoading || isPending}
                                                        onValueChange={async (value) => {
                                                            const nextTheme = value as Theme;
                                                            setDraft((current) => ({ ...current, theme: nextTheme }));

                                                            if (!user) {
                                                                return;
                                                            }

                                                            await updateUser({ theme: nextTheme });
                                                        }}
                                                    >
                                                        <SelectTrigger id="theme-dialog-theme" className="w-full">
                                                            <SelectValue placeholder="Theme" />
                                                        </SelectTrigger>
                                                        <SelectContent className="ring-0 shadow-none">
                                                            {THEME_OPTIONS.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="theme-dialog-accent">Accent</Label>
                                                    <Select
                                                        value={draft.accent}
                                                        disabled={isLoading || isPending}
                                                        onValueChange={async (value) => {
                                                            const nextAccent = value as ThemeDraft['accent'];
                                                            setDraft((current) => ({ ...current, accent: nextAccent }));

                                                            if (!user) {
                                                                return;
                                                            }

                                                            await updateUser({ accent: nextAccent });
                                                        }}
                                                    >
                                                        <SelectTrigger id="theme-dialog-accent" className="w-full">
                                                            <SelectValue placeholder="Accent" />
                                                        </SelectTrigger>
                                                        <SelectContent className="ring-0 shadow-none">
                                                            {ACCENT_OPTIONS.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    <span className="flex items-center gap-2">
                                                                        <span
                                                                            className="size-2.5 rounded-full"
                                                                            style={{ backgroundColor: option.swatch }}
                                                                        />
                                                                        {option.label}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="theme-dialog-radius">Radius</Label>
                                                    <Select
                                                        value={draft.radius}
                                                        disabled={isLoading || isPending}
                                                        onValueChange={async (value) => {
                                                            const nextRadius = value as ThemeDraft['radius'];
                                                            setDraft((current) => ({ ...current, radius: nextRadius }));

                                                            if (!user) {
                                                                return;
                                                            }

                                                            await updateUser({ radius: nextRadius });
                                                        }}
                                                    >
                                                        <SelectTrigger id="theme-dialog-radius" className="w-full">
                                                            <SelectValue placeholder="Radius" />
                                                        </SelectTrigger>
                                                        <SelectContent className="ring-0 shadow-none">
                                                            {RADIUS_OPTIONS.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </HeroAction>
                        </div>
                    </Hero>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <section className="space-y-5" style={previewStyle}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted">
                                        Hover me
                                    </TooltipTrigger>
                                    <TooltipContent>Tooltip preview</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>Theme</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge>Default</Badge>
                                <Badge variant="outline">Outline</Badge>
                                <Badge variant="destructive">Destructive</Badge>
                                <Badge variant="ghost">Ghost</Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button size="sm">Primary</Button>
                                <Button size="sm" variant="outline">
                                    Outline
                                </Button>
                                <Button size="sm" variant="ghost">
                                    Ghost
                                </Button>
                                <Button size="sm" variant="destructive">
                                    Danger
                                </Button>
                            </div>

                            <ButtonGroup>
                                <ButtonGroupText>Workspace</ButtonGroupText>
                                <Button variant="outline" size="sm">
                                    Team
                                </Button>
                                <ButtonGroupSeparator />
                                <Button variant="outline" size="sm">
                                    Billing
                                </Button>
                                <ButtonGroupSeparator />
                                <Button variant="outline" size="sm">
                                    Security
                                </Button>
                            </ButtonGroup>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="theme-preview-input" className="sr-only">
                                        Input
                                    </Label>
                                    <Input id="theme-preview-input" defaultValue="Theme preview" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="theme-preview-select" className="sr-only">
                                        Select preview
                                    </Label>
                                    <Select defaultValue={ACCENT_OPTIONS[0].value}>
                                        <SelectTrigger id="theme-preview-select" className="w-full">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="ring-0 shadow-none">
                                            {ACCENT_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <InputGroup>
                                <InputGroupAddon>
                                    <InputGroupText>longlink.app/</InputGroupText>
                                </InputGroupAddon>
                                <InputGroupInput defaultValue="theme" />
                                <InputGroupButton variant="outline">Copy</InputGroupButton>
                            </InputGroup>

                            <Tabs defaultValue="overview" className="!gap-3">
                                <TabsList variant="line">
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="tokens">Tokens</TabsTrigger>
                                </TabsList>
                                <TabsContent value="overview" className="space-y-3 !pt-2">
                                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Avatar>
                                                    <AvatarImage
                                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%236366f1'/%3E%3C/svg%3E"
                                                        alt="Theme preview"
                                                    />
                                                    <AvatarFallback>LL</AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <Progress value={72}>
                                                <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                                                    72%
                                                </span>
                                            </Progress>
                                        </div>

                                        <AvatarGroup>
                                            <Avatar size="sm">
                                                <AvatarFallback>SA</AvatarFallback>
                                            </Avatar>
                                            <Avatar size="sm">
                                                <AvatarFallback>JP</AvatarFallback>
                                            </Avatar>
                                            <Avatar size="sm">
                                                <AvatarFallback>RM</AvatarFallback>
                                            </Avatar>
                                            <AvatarGroupCount>+3</AvatarGroupCount>
                                        </AvatarGroup>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-3 w-3/5" />
                                            <Skeleton className="h-3 w-2/5" />
                                        </div>
                                        <Spinner />
                                    </div>
                                </TabsContent>
                                <TabsContent value="tokens" className="space-y-3 !pt-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow />
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Theme</TableCell>
                                                <TableCell>{draft.theme}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>Accent</TableCell>
                                                <TableCell>{draft.accent}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>Radius</TableCell>
                                                <TableCell>{draft.radius}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </section>

                        <section className="space-y-5">
                            <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                                    Menu demo
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="ring-0 shadow-none">
                                    <DropdownMenuItem>Refresh tokens</DropdownMenuItem>
                                    <DropdownMenuItem>Copy palette</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive">Reset theme</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Checkbox defaultChecked />
                                        <RadioGroup defaultValue="one" className="flex gap-3">
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="one" />
                                                <Label>One</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="two" />
                                                <Label>Two</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="space-y-3">
                                        <Switch defaultChecked />
                                        <Slider defaultValue={[32]} min={0} max={100} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Textarea
                                        defaultValue="Use the same radius and accent in large surfaces too."
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Toggle defaultPressed>Active</Toggle>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Dialog>
                                    <DialogTrigger
                                        className={cn(
                                            buttonVariants({ variant: 'outline', size: 'sm' }),
                                            'justify-center'
                                        )}
                                    >
                                        Open dialog
                                    </DialogTrigger>
                                    <DialogContent>
                                        <div className="flex items-center gap-2 pt-2">
                                            <Button size="sm">Confirm</Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                <Popover>
                                    <PopoverTrigger className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                                        Open popover
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <PopoverHeader />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <KbdGroup>
                                    <Kbd>⌘</Kbd>
                                    <Kbd>K</Kbd>
                                </KbdGroup>
                            </div>
                        </section>
                    </section>
                </div>
            </main>
        </div>
    );
}
