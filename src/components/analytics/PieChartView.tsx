
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { tooltipFormatter, COLORS } from "@/lib/utils";

interface PieChartViewProps {
  data: Array<{ name: string; value: number }>;
}

export const PieChartView = ({ data }: PieChartViewProps) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available for the selected timeframe
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip formatter={tooltipFormatter} />
        <Legend />
      </RechartsPie>
    </ResponsiveContainer>
  );
};
