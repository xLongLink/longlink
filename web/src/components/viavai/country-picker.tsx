import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';

type CountryMap = Record<string, string>;

type CountryOption = {
    code: string;
    name: string;
};

type CountryPickerProps = {
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (value: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
};

export function CountryPicker({
    value,
    defaultValue,
    onValueChange,
    placeholder = 'Select a country',
    disabled = false,
    className,
}: CountryPickerProps) {
    const [countries, setCountries] = useState<CountryOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadCountries = async () => {
            try {
                setIsLoading(true);
                const response = await apiFetch<CountryMap>('/lists/countries');

                if (!isMounted) return;

                const countryOptions = Object.entries(response)
                    .map(([code, name]) => ({ code, name }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                setCountries(countryOptions);
                setError(null);
            } catch {
                if (!isMounted) return;
                setError('Unable to load countries.');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadCountries();

        return () => {
            isMounted = false;
        };
    }, []);

    const emptyMessage = useMemo(() => {
        if (isLoading) return 'Loading countries...';
        if (error) return error;
        return 'No countries found.';
    }, [error, isLoading]);

    return (
        <Combobox
            items={countries}
            value={value}
            defaultValue={defaultValue}
            onValueChange={onValueChange}
            itemToString={(item: CountryOption | null) =>
                item ? `${item.name} (${item.code})` : ''
            }
            autoHighlight
            disabled={disabled || isLoading}
        >
            <ComboboxInput
                className={className}
                placeholder={placeholder}
                showClear
                disabled={disabled || isLoading}
            />
            <ComboboxContent>
                <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
                <ComboboxList>
                    {(item: CountryOption) => (
                        <ComboboxItem key={item.code} value={item.code}>
                            {item.name} ({item.code})
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
