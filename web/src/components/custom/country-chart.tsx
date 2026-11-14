import { Maps } from './maps';
import { useState } from 'react';
import type { MapData } from './map-data';
import { Badge } from '@/components/reui/badge';
import { Button } from '@/components/shadcn/button';
import { IconTile } from '@/components/reui/icon-tile';
import './analytics.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';

export type CountryUsage = {
    id: string;
    name: string;
    flag: string;
    messages: number;
    people: number;
    model: string;
    share: number;
    center: [number, number];
    zoom?: number;
};

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** Combines keyboard-selectable country rankings with local atlas boundaries. */
export function CountryChart({
    countries,
    geography,
    summary
}: {
    countries: CountryUsage[];
    geography: MapData;
    summary: { countries: number; messages: number };
}) {
    const [selectedId, setSelectedId] = useState(countries[0]?.id);

    const position = Math.max(
        0,
        countries.findIndex((country) => country.id === selectedId)
    );

    const selected = countries[position];

    return (
        <Card className="analytics-card @container/country relative isolate h-full min-w-0 overflow-hidden">
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
                <CardTitle>Top countries this month</CardTitle>
                <CardDescription>Leaderboard · Share of messages</CardDescription>
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
                        label="Community messages by country"
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
                        <p className="text-xs text-muted-foreground">
                            {compactNumber.format(selected.messages)} messages · {selected.people.toLocaleString()}{' '}
                            people
                        </p>
                        <Badge variant="info-light">Most used: {selected.model}</Badge>
                    </div>
                )}
                <p className="relative z-20 mt-auto text-xs text-muted-foreground @min-[640px]/country:w-[48%]">
                    {summary.countries} countries · {compactNumber.format(summary.messages)} messages · Demo data
                </p>
            </CardContent>
        </Card>
    );
}
