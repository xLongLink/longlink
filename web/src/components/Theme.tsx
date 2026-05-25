import { createContext, useEffect, useState } from 'react';

import { setThemeMode, type Theme } from '@/lib/theme';

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    theme?: Theme;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    theme: themeOverride,
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => themeOverride ?? defaultTheme);

    // Keep the document theme aligned with the current override or default theme.
    useEffect(() => {
        setTheme(themeOverride ?? defaultTheme);
    }, [defaultTheme, themeOverride]);

    /* Sync the document theme class with the selected theme. */
    useEffect(() => {
        const root = window.document.documentElement;
        setThemeMode(root, theme);
    }, [theme]);

    const value = {
        theme,
        /**
         * Updates the active document theme.
         */
        setTheme: (theme: Theme) => {
            setTheme(theme);
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}
