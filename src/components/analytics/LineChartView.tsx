
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { tooltipFormatter } from "@/lib/utils";

interface LineChartViewProps {
  data: Array<{ date: string; amount: number }>;
}

export const LineChartView = ({ data }: LineChartViewProps) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available for the selected timeframe
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={tooltipFormatter} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
