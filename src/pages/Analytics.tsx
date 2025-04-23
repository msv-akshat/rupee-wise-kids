
import React, { useState } from "react";
import { subDays, subMonths, isAfter, Timestamp } from "date-fns";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useExpensesData } from "@/hooks/useExpensesData";
import { PieChartView } from "@/components/analytics/PieChartView";
import { LineChartView } from "@/components/analytics/LineChartView";
import { TimeFrameSelector } from "@/components/analytics/TimeFrameSelector";
import { Expense } from "@/types/models";

export default function Analytics() {
  const { expenses, isLoading } = useExpensesData();
  const [timeFrame, setTimeFrame] = useState("month");
  const [viewType, setViewType] = useState("category");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  // Filter expenses based on the selected timeframe
  const getFilteredExpenses = () => {
    if (!expenses.length) return [];
    
    let startDate: Date;
    
    if (timeFrame === "custom") {
      startDate = dateRange.from;
    } else if (timeFrame === "week") {
      startDate = subDays(new Date(), 7);
    } else if (timeFrame === "month") {
      startDate = subMonths(new Date(), 1);
    } else { // year
      startDate = subMonths(new Date(), 12);
    }
    
    const endDate = timeFrame === "custom" ? dateRange.to : new Date();
    
    return expenses.filter(expense => {
      const expenseDate = expense.date instanceof Timestamp 
        ? expense.date.toDate() 
        : new Date(expense.date);
      
      return isAfter(expenseDate, startDate) && 
             (isAfter(endDate, expenseDate) || 
             expenseDate.getTime() === endDate.getTime());
    });
  };

  // Group expenses by category
  const getCategoryData = () => {
    const filteredExpenses = getFilteredExpenses();
    const categories: {[key: string]: number} = {};
    
    filteredExpenses.forEach(expense => {
      const category = expense.category || 'Other';
      categories[category] = (categories[category] || 0) + expense.amount;
    });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  // Format expenses by date for time series
  const getTimeSeriesData = () => {
    const filteredExpenses = getFilteredExpenses();
    const dateGrouped: {[key: string]: number} = {};
    
    filteredExpenses.forEach((expense: Expense) => {
      const expenseDate = expense.date instanceof Timestamp 
        ? expense.date.toDate() 
        : new Date(expense.date);
      
      const dateKey = timeFrame === "week" 
        ? expenseDate.toLocaleDateString('en-US', { weekday: 'short' })
        : timeFrame === "month"
        ? expenseDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
        : expenseDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      dateGrouped[dateKey] = (dateGrouped[dateKey] || 0) + expense.amount;
    });
    
    return Object.entries(dateGrouped)
      .map(([date, amount]) => ({ date, amount }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const categoryData = getCategoryData();
  const timeSeriesData = getTimeSeriesData();
  const totalExpenses = getFilteredExpenses().reduce((sum, expense) => sum + expense.amount, 0);
  const avgPerDay = totalExpenses / (
    timeFrame === "week" ? 7 : 
    timeFrame === "month" ? 30 : 
    timeFrame === "year" ? 365 : 
    Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)))
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <TimeFrameSelector
          timeFrame={timeFrame}
          dateRange={dateRange}
          onTimeFrameChange={setTimeFrame}
          onDateRangeChange={setDateRange}
        />
      </div>

      <div className="grid gap-6">
        {expenses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Expense Data</CardTitle>
              <CardDescription>Start by adding your first expense.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <div className="text-muted-foreground flex flex-col items-center">
                <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                <p>Start logging expenses to see analytics</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
                  <CardDescription>
                    {timeFrame === "week" ? "Last 7 days" : 
                     timeFrame === "month" ? "Last 30 days" : 
                     timeFrame === "year" ? "Last 12 months" : 
                     "Custom range"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalExpenses)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Per Day</CardTitle>
                  <CardDescription>Daily average spending</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(avgPerDay)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Expense Analysis</CardTitle>
                <CardDescription>
                  Breakdown of your expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="category" onValueChange={setViewType}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="category">By Category</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="category" className="h-80">
                    <PieChartView data={categoryData} />
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="h-80">
                    <LineChartView data={timeSeriesData} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
