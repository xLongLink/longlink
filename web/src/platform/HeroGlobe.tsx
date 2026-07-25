import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/land-110m.json';
import { geoOrthographic, geoPath, type GeoPermissibleObjects } from 'd3-geo';

const centerX = 700;
const centerY = 720;
const radiusX = 900;
const radiusY = 535;
const mapStretch = radiusX / radiusY;

// Cast the static TopoJSON import at the data boundary; world-atlas exposes a borderless land object.
const worldTopology = worldAtlas as unknown as Parameters<typeof feature>[0];
const land = feature(worldTopology, 'land') as GeoPermissibleObjects;

// Project the land once because the hero globe is a static background asset.
const projection = geoOrthographic().translate([centerX, centerY]).scale(radiusY).rotate([35, -18]).clipAngle(90);
const landPath = geoPath<typeof land>(projection)(land) ?? '';

/** Renders the projected world landmass inside the landing-page globe. */
export function HeroGlobe() {
    return (
        <svg
            aria-hidden="true"
            className="homepage-hero-globe"
            focusable="false"
            viewBox="0 0 1400 1260"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <clipPath id="hero-globe-clip">
                    <ellipse cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} />
                </clipPath>
            </defs>

            <ellipse className="homepage-hero-globe-surface" cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} />
            <g clipPath="url(#hero-globe-clip)">
                <g
                    transform={`translate(${centerX} ${centerY}) scale(${mapStretch} 1) translate(${-centerX} ${-centerY})`}
                >
                    <path className="homepage-hero-globe-land" d={landPath} />
                </g>
            </g>
            <ellipse className="homepage-hero-globe-horizon" cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} />
        </svg>
    );
}
