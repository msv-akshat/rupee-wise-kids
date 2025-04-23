
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense } from "@/types/models";
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
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { format, subDays, subMonths, isAfter } from "date-fns";
import { CalendarIcon, BarChart3, PieChart, LineChart as LineChartIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#48C9B0', '#F4D03F'];

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Custom tooltip formatter to resolve the TypeScript spread error
const tooltipFormatter = (value: number | string) => {
  if (typeof value === 'number') {
    return formatCurrency(value);
  }
  return value;
};

export default function Analytics() {
  const { currentUser, userRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState("month");
  const [viewType, setViewType] = useState("category");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      
      try {
        let expensesQuery;
        
        if (userRole === 'parent') {
          // Parent sees all children's expenses
          // First, get all children
          const childrenSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'children'));
          const childrenIds = childrenSnapshot.docs.map(doc => doc.id);
          
          if (childrenIds.length === 0) {
            setExpenses([]);
            setIsLoading(false);
            return;
          }
          
          // Then get expenses for all children
          const expensesPromises = childrenIds.map(childId => 
            getDocs(query(
              collection(db, 'expenses'),
              where('childId', '==', childId),
              orderBy('date', 'desc')
            ))
          );
          
          const expensesSnapshots = await Promise.all(expensesPromises);
          const allExpenses = expensesSnapshots.flatMap(snapshot => 
            snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                amount: data.amount,
                category: data.category,
                description: data.description,
                date: data.date,
                userId: data.userId,
                childId: data.childId,
                createdAt: data.createdAt,
              } as Expense;
            })
          );
          
          setExpenses(allExpenses);
        } else {
          // Child sees their own expenses
          expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
          );
          
          const expensesSnapshot = await getDocs(expensesQuery);
          const expensesData = expensesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              amount: data.amount,
              category: data.category, 
              description: data.description,
              date: data.date,
              userId: data.userId,
              childId: data.childId,
              createdAt: data.createdAt,
            } as Expense;
          });
          
          setExpenses(expensesData);
        }
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [currentUser, userRole]);

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

  // Group expenses by category and calculate totals
  const getCategoryData = () => {
    const filteredExpenses = getFilteredExpenses();
    const categories: {[key: string]: number} = {};
    
    filteredExpenses.forEach(expense => {
      const category = expense.category || 'Other';
      categories[category] = (categories[category] || 0) + expense.amount;
    });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  // Format expenses by date for time series chart
  const getTimeSeriesData = () => {
    const filteredExpenses = getFilteredExpenses();
    const dateGrouped: {[key: string]: number} = {};
    
    filteredExpenses.forEach(expense => {
      const expenseDate = expense.date instanceof Timestamp 
        ? expense.date.toDate() 
        : new Date(expense.date);
      
      let dateKey;
      if (timeFrame === "week") {
        dateKey = format(expenseDate, 'EEE'); // Mon, Tue, etc.
      } else if (timeFrame === "month") {
        dateKey = format(expenseDate, 'dd MMM'); // 01 Jan
      } else { // year or custom
        dateKey = format(expenseDate, 'MMM yyyy'); // Jan 2023
      }
      
      dateGrouped[dateKey] = (dateGrouped[dateKey] || 0) + expense.amount;
    });
    
    return Object.entries(dateGrouped).map(([date, amount]) => ({ date, amount }));
  };

  const categoryData = getCategoryData();
  const timeSeriesData = getTimeSeriesData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Handle date range selection ensuring we always have both from and to dates
  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      setDateRange({
        from: range.from,
        to: range.to || range.from // If 'to' is not selected, use 'from' as fallback
      });
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex items-center space-x-2">
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          
          {timeFrame === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-auto justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to ? (
                    <>
                      {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                    </>
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {expenses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Expense Data</CardTitle>
              <CardDescription>
                {userRole === 'child' 
                  ? "You haven't logged any expenses yet. Start by adding your first expense."
                  : "No expenses have been logged by your children yet."}
              </CardDescription>
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
                     dateRange.from && dateRange.to ? `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}` : 
                     "Custom range"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      getFilteredExpenses().reduce((sum, expense) => sum + expense.amount, 0)
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Per Day</CardTitle>
                  <CardDescription>
                    Daily average spending
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      getFilteredExpenses().reduce((sum, expense) => sum + expense.amount, 0) / 
                      (timeFrame === "week" ? 7 : 
                       timeFrame === "month" ? 30 : 
                       timeFrame === "year" ? 365 : 
                       Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))))
                    )}
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
                <Tabs defaultValue="category">
                  <TabsList className="mb-4">
                    <TabsTrigger 
                      value="category" 
                      onClick={() => setViewType("category")}
                      className="flex items-center"
                    >
                      <PieChart className="w-4 h-4 mr-2" />
                      By Category
                    </TabsTrigger>
                    <TabsTrigger 
                      value="timeline" 
                      onClick={() => setViewType("timeline")}
                      className="flex items-center"
                    >
                      <LineChartIcon className="w-4 h-4 mr-2" />
                      Timeline
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="category" className="h-80">
                    {categoryData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={tooltipFormatter} />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data available for the selected timeframe
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="h-80">
                    {timeSeriesData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={timeSeriesData}
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
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data available for the selected timeframe
                      </div>
                    )}
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
