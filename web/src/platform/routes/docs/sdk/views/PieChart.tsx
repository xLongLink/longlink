import ChartDocumentation from './ChartDocumentation';

/** Documents part-to-whole charts in Views. */
export default function PieChartPage() {
    return (
        <ChartDocumentation
            name="PieChart"
            introduction="Displays a part-to-whole breakdown as a doughnut. Use nonnegative values from one series."
        />
    );
}
