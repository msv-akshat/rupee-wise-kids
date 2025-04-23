
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndianRupee } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Expense } from "@/types/models";
import { CategorySummary } from "./CategorySummary";

interface ExpenseSummaryProps {
  expenses: Expense[];
  timeframe: "all" | "week" | "month";
  onTimeframeChange: (value: "all" | "week" | "month") => void;
  totalExpenses: number;
}

export const ExpenseSummary = ({
  expenses,
  timeframe,
  onTimeframeChange,
  totalExpenses,
}: ExpenseSummaryProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
          <CardDescription>
            {timeframe === "all"
              ? "All time"
              : timeframe === "week"
              ? "Last 7 days"
              : "Last 30 days"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center">
            <IndianRupee className="h-5 w-5 mr-1" />
            {formatCurrency(totalExpenses).replace('₹', '')}
          </div>
          <div className="mt-4">
            <Tabs defaultValue={timeframe} onValueChange={(v) => onTimeframeChange(v as any)}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="all">All Time</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">By Category</CardTitle>
          <CardDescription>How your money is spent</CardDescription>
        </CardHeader>
        <CardContent>
          <CategorySummary expenses={expenses} />
        </CardContent>
      </Card>
    </div>
  );
};
