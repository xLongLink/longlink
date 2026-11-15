import { Maps } from './maps';
import type { MapData } from './map-data';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/shadcn/button';
import { IconTile } from '@/components/reui/icon-tile';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';

export type CountryUsage = {
    id: string;
    name: string;
    flag: string;
    share: number;
    center: [number, number];
    zoom?: number;
};

/** Combines keyboard-selectable country rankings with local atlas boundaries. */
export function CountryChart<T extends CountryUsage>({
    countries,
    geography,
    summary,
    title,
    description,
    label,
    renderDetails
}: {
    countries: T[];
    geography: MapData;
    summary?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    label: string;
    renderDetails?: (country: T) => ReactNode;
}) {
    const [selectedId, setSelectedId] = useState(countries[0]?.id);

    const position = Math.max(
        0,
        countries.findIndex((country) => country.id === selectedId)
    );

    const selected = countries[position];

    return (
        <Card className="@container/country relative isolate h-full min-w-0 overflow-hidden">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 hidden bg-linear-to-r from-card from-25% via-card/95 via-42% to-transparent to-70% @min-[640px]/country:block"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-28 bg-linear-to-b from-card via-card/85 to-transparent @min-[640px]/country:block"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-20 bg-linear-to-t from-card/90 to-transparent @min-[640px]/country:block"
            />
            <CardHeader className="relative z-20 gap-0">
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                <CardAction className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {countries.length ? position + 1 : 0} / {countries.length}
                    </span>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Previous country"
                        disabled={!countries.length}
                        onClick={() =>
                            setSelectedId(countries[(position + countries.length - 1) % countries.length]?.id)
                        }
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Next country"
                        disabled={!countries.length}
                        onClick={() => setSelectedId(countries[(position + 1) % countries.length]?.id)}
                    >
                        <ChevronRight />
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 @min-[640px]/country:min-h-84">
                <div className="relative z-20 flex flex-col gap-2 @min-[640px]/country:w-[44%]">
                    {countries.map((country) => (
                        <Button
                            key={country.id}
                            type="button"
                            variant={selected?.id === country.id ? 'secondary' : 'ghost'}
                            className="group/country min-h-12 justify-start gap-3 text-sm"
                            aria-pressed={selected?.id === country.id}
                            onPointerEnter={() => setSelectedId(country.id)}
                            onFocus={() => setSelectedId(country.id)}
                            onClick={() => setSelectedId(country.id)}
                        >
                            <IconTile size="sm" variant="outline">
                                <span className="text-xl" aria-hidden="true">
                                    {country.flag}
                                </span>
                            </IconTile>
                            <span className="flex-1 text-left">{country.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums group-aria-pressed/country:text-(--chart-3)">
                                {country.share}%
                            </span>
                        </Button>
                    ))}
                </div>
                <div className="relative h-60 overflow-hidden @min-[640px]/country:absolute @min-[640px]/country:inset-0 @min-[640px]/country:left-[28%] @min-[640px]/country:h-auto">
                    <Maps
                        label={label}
                        geography={geography}
                        selectedId={selected?.id}
                        selectableIds={countries.map((country) => country.id)}
                        onSelect={setSelectedId}
                        height="100%"
                        fit="cover"
                        center={selected?.center}
                        scale={200}
                        zoom={selected?.zoom ?? 1.5}
                    />
                </div>
                {selected && (
                    <div
                        className="relative z-20 flex max-w-full flex-col items-start gap-1 self-end bg-card/90 p-3 @min-[640px]/country:absolute @min-[640px]/country:right-4 @min-[640px]/country:bottom-4 @min-[640px]/country:max-w-[48%]"
                        aria-live="polite"
                    >
                        <p className="text-sm font-medium">
                            {selected.flag} #{position + 1} {selected.name}
                        </p>
                        {renderDetails?.(selected)}
                    </div>
                )}
                {summary && (
                    <p className="relative z-20 mt-auto text-xs text-muted-foreground @min-[640px]/country:w-[48%]">
                        {summary}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
