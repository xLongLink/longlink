import { expect, it } from 'vitest';
import { coordinateError, routeError } from '@/components/longlink/maps/data';
import type { MapCoordinate, MapRoute } from '@/components/longlink/maps/types';

it.each<MapCoordinate>([
    [-180.001, 0],
    [180.001, 0],
    [0, -90.001],
    [0, 90.001],
    [NaN, 0],
    [Infinity, 0],
    [-Infinity, 0],
    [0, NaN],
    [0, Infinity],
    [0, -Infinity]
])('rejects invalid map coordinates [%s, %s]', (longitude, latitude) => {
    // Arrange
    const coordinates: MapCoordinate[] = [[longitude, latitude]];

    // Act
    const error = coordinateError(coordinates);

    // Assert
    expect(error).toBe('Map coordinates must contain a valid longitude and latitude.');
});

it('accepts inclusive longitude and latitude boundaries', () => {
    // Arrange
    const coordinates: MapCoordinate[] = [
        [-180, -90],
        [-180, 90],
        [180, -90],
        [180, 90]
    ];

    // Act
    const error = coordinateError(coordinates);

    // Assert
    expect(error).toBeUndefined();
});

it('ignores extra ordinates when checking map coordinates', () => {
    // Arrange
    const coordinates: MapCoordinate = [180, -90];
    coordinates.push(NaN, Infinity);

    // Act
    const error = coordinateError([coordinates]);

    // Assert
    expect(error).toBeUndefined();
});

it('prioritizes coordinate errors over short routes and retains the short-route error for valid coordinates', () => {
    // Arrange
    const routes: MapRoute[] = [
        { id: 'short', coordinates: [[0, 0]] },
        { id: 'invalid', coordinates: [[181, 0]] }
    ];

    // Act
    const coordinateFailure = routeError(routes);
    const lengthFailure = routeError(routes.slice(0, 1));

    // Assert
    expect(coordinateFailure).toBe('Map coordinates must contain a valid longitude and latitude.');
    expect(lengthFailure).toBe('Routes require at least two coordinates.');
});
