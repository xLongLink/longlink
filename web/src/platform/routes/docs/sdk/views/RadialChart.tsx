import ChartDocumentation from './ChartDocumentation';

/** Documents concentric radial charts in Views. */
export default function RadialChartPage() {
    return (
        <ChartDocumentation
            name="RadialChart"
            introduction="Compares one numeric series across categories using concentric radial bars. Values share an automatically calculated scale, not a percentage target."
        />
    );
}
