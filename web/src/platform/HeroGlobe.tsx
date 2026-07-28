import { geoOrthographic, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/land-110m.json';

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
            className="homepage-hero-globe pointer-events-none absolute left-1/2 max-w-none -translate-x-1/2 text-accent opacity-90"
            focusable="false"
            viewBox="0 0 1400 1260"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient
                    id="hero-globe-cap-shadow"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    x2="0"
                    y1="230"
                    y2="560"
                >
                    <stop offset="0%" stopColor="black" stopOpacity="1" />
                    <stop offset="28%" stopColor="black" stopOpacity="0.82" />
                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                    id="hero-globe-land-reveal"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1260"
                >
                    <stop offset="0%" stopColor="black" />
                    <stop offset="22%" stopColor="black" />
                    <stop offset="32%" stopColor="white" />
                    <stop offset="100%" stopColor="white" />
                </linearGradient>
                <filter id="hero-globe-rim-blur" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="14" />
                </filter>
                <clipPath id="hero-globe-clip">
                    <ellipse cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} />
                </clipPath>
                <mask id="hero-globe-land-mask" height="1260" maskUnits="userSpaceOnUse" width="1400" x="0" y="0">
                    <rect fill="url(#hero-globe-land-reveal)" height="1260" width="1400" />
                </mask>
            </defs>

            <ellipse className="homepage-hero-globe-surface" cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} />
            <ellipse
                className="homepage-hero-globe-blue-rim"
                cx={centerX}
                cy={centerY}
                filter="url(#hero-globe-rim-blur)"
                rx={radiusX}
                ry={radiusY}
            />
            <g clipPath="url(#hero-globe-clip)">
                <rect className="homepage-hero-globe-cap-shadow" height="1260" width="1400" />
                <g
                    mask="url(#hero-globe-land-mask)"
                    transform={`translate(${centerX} ${centerY}) scale(${mapStretch} 1) translate(${-centerX} ${-centerY})`}
                >
                    <path className="homepage-hero-globe-land" d={landPath} />
                </g>
            </g>
            <ellipse className="homepage-hero-globe-horizon" cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} />
        </svg>
    );
}
