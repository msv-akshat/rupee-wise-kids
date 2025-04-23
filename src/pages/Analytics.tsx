
import React, { useState, useEffect } from "react";
import { subDays, subMonths, isAfter } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { BarChart3, UserPlus, UserRound } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useExpensesData } from "@/hooks/useExpensesData";
import { PieChartView } from "@/components/analytics/PieChartView";
import { LineChartView } from "@/components/analytics/LineChartView";
import { TimeFrameSelector } from "@/components/analytics/TimeFrameSelector";
import { Expense } from "@/types/models";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Analytics() {
  const { expenses, isLoading } = useExpensesData();
  const { userRole, currentUser } = useAuth();
  const [timeFrame, setTimeFrame] = useState("month");
  const [viewType, setViewType] = useState("category");
  const [expenseType, setExpenseType] = useState<"all" | "parent" | "child" | string>(
    userRole === "child" ? "all" : "all"
  );
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("all");

  // Fetch children if user is parent
  useEffect(() => {
    const fetchChildren = async () => {
      if (userRole === 'parent' && currentUser) {
        try {
          const childrenSnapshot = await getDocs(
            collection(db, 'users', currentUser.uid, 'children')
          );
          const childrenData = childrenSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().displayName,
          }));
          setChildren(childrenData);
          console.log("Fetched children for analytics:", childrenData);
        } catch (error) {
          console.error("Error fetching children:", error);
          toast.error("Failed to load children data");
        }
      }
    };
    
    fetchChildren();
  }, [currentUser, userRole]);
  
  // Filter expenses based on the selected timeframe and expense type
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
    
    // Filter by date
    let filtered = expenses.filter(expense => {
      const expenseDate = expense.date instanceof Timestamp 
        ? expense.date.toDate() 
        : new Date(expense.date);
      
      return isAfter(expenseDate, startDate) && 
             (isAfter(endDate, expenseDate) || 
             expenseDate.getTime() === endDate.getTime());
    });
    
    // Additional filters based on expense type and selected child
    if (userRole === 'parent') {
      if (expenseType === 'parent') {
        filtered = filtered.filter(expense => expense.isParentExpense === true);
      } else if (expenseType === 'child') {
        filtered = filtered.filter(expense => expense.isChildExpense === true || (expense.childId && !expense.isParentExpense));
        
        // Further filter by selected child
        if (selectedChild !== 'all') {
          filtered = filtered.filter(expense => expense.userId === selectedChild || expense.childId === selectedChild);
        }
      }
    }
    
    return filtered;
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

  // Use effect to log when expenses are loaded or changed
  useEffect(() => {
    console.log("Analytics: Expenses data updated, count:", expenses.length);
  }, [expenses]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const categoryData = getCategoryData();
  const timeSeriesData = getTimeSeriesData();
  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const avgPerDay = totalExpenses / (
    timeFrame === "week" ? 7 : 
    timeFrame === "month" ? 30 : 
    timeFrame === "year" ? 365 : 
    Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)))
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-4">
          {userRole === 'parent' && (
            <div className="flex items-center gap-2">
              <Select
                value={expenseType}
                onValueChange={(value) => setExpenseType(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Expense Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expenses</SelectItem>
                  <SelectItem value="parent">Parent Expenses</SelectItem>
                  <SelectItem value="child">Children Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {userRole === 'parent' && expenseType === 'child' && children.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedChild}
                onValueChange={(value) => setSelectedChild(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Child" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Children</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <TimeFrameSelector
            timeFrame={timeFrame}
            dateRange={dateRange}
            onTimeFrameChange={setTimeFrame}
            onDateRangeChange={setDateRange}
          />
        </div>
      </div>

      {userRole === 'parent' && (
        <div className="flex items-center gap-2 pb-2">
          <Badge variant={expenseType === 'all' ? 'default' : 'outline'}>
            All Expenses
          </Badge>
          <Badge variant={expenseType === 'parent' ? 'default' : 'outline'}>
            <UserRound className="h-3 w-3 mr-1" />
            Parent Expenses
          </Badge>
          <Badge variant={expenseType === 'child' ? 'default' : 'outline'}>
            <UserPlus className="h-3 w-3 mr-1" />
            Children Expenses
          </Badge>
          {expenseType === 'child' && selectedChild !== 'all' && (
            <Badge variant="secondary">
              {children.find(c => c.id === selectedChild)?.name || 'Child'}
            </Badge>
          )}
        </div>
      )}

      <div className="grid gap-6">
        {filteredExpenses.length === 0 ? (
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
