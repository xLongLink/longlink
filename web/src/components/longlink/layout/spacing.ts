export function spacing(units: number | undefined) {
    return units === undefined ? undefined : `calc(var(--spacing) * ${units})`;
}
