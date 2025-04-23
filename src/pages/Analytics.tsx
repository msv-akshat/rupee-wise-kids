
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Button } from "@/components/ui/button";
import { PieChart, BarChart, LineChart } from "lucide-react";
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, BarChart as RechartsBar, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart as RechartsLine, Line } from "recharts";
import { toast } from "sonner";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Timestamp;
  userId: string;
  childId: string;
}

interface Child {
  uid: string;
  displayName: string;
}

const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#6366F1", // indigo-500
  "#14B8A6", // teal-500
];

const Analytics = () => {
  const { currentUser, userRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [chartType, setChartType] = useState<"category" | "time">("category");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        // If parent, fetch children first
        if (userRole === "parent") {
          const childrenRef = collection(db, "users", currentUser.uid, "children");
          const childrenSnap = await getDocs(childrenRef);
          const childrenData = childrenSnap.docs.map((doc) => ({
            uid: doc.id,
            ...doc.data(),
          })) as Child[];
          
          setChildren(childrenData);
          
          // If children exist, set the first child as selected by default
          if (childrenData.length > 0 && !selectedChild) {
            setSelectedChild(childrenData[0].uid);
          }
        }

        // Get date range based on selected timeRange
        const now = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date(now.setMonth(now.getMonth() - 1));
        }

        // Build the query based on user role
        let expensesQuery;
        if (userRole === "parent" && selectedChild) {
          // Parent viewing a specific child's expenses
          expensesQuery = query(
            collection(db, "expenses"),
            where("childId", "==", selectedChild),
            where("date", ">=", Timestamp.fromDate(startDate)),
            orderBy("date", "asc")
          );
        } else {
          // Child viewing their own expenses
          expensesQuery = query(
            collection(db, "expenses"),
            where("userId", "==", currentUser.uid),
            where("date", ">=", Timestamp.fromDate(startDate)),
            orderBy("date", "asc")
          );
        }

        const expensesSnap = await getDocs(expensesQuery);
        const expensesData = expensesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];

        setExpenses(expensesData);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        toast.error("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, userRole, selectedChild, timeRange]);

  // Create category data for pie chart
  const getCategoryData = () => {
    const categories: Record<string, number> = {};
    expenses.forEach((expense) => {
      const category = expense.category || "Other";
      categories[category] = (categories[category] || 0) + expense.amount;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Create time-series data for line chart
  const getTimeSeriesData = () => {
    const dateFormat: Record<string, string> = {
      week: "do MMM",
      month: "do MMM",
      year: "MMM yyyy",
    };

    const dateMap: Record<string, number> = {};
    expenses.forEach((expense) => {
      const date = expense.date.toDate();
      const formattedDate = formatDate(date, timeRange);
      dateMap[formattedDate] = (dateMap[formattedDate] || 0) + expense.amount;
    });

    return Object.entries(dateMap).map(([date, amount]) => ({
      date,
      amount,
    }));
  };

  // Format date based on time range
  const formatDate = (date: Date, range: string): string => {
    if (range === "week") {
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
      }).format(date);
    } else if (range === "month") {
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
      }).format(date);
    } else {
      return new Intl.DateTimeFormat("en-IN", {
        month: "short",
      }).format(date);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate total spending
  const getTotalSpending = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  // Helper function to get title based on user role
  const getTitle = () => {
    if (userRole === "parent") {
      const childName = 
        children.find(child => child.uid === selectedChild)?.displayName || 
        "Child";
      return `${childName}'s Expenses`;
    }
    return "My Expense Analytics";
  };

  const categoryData = getCategoryData();
  const timeSeriesData = getTimeSeriesData();

  // Fix for the TypeScript error - Create a custom formatter function for the tooltip
  // that safely handles the value parameter without using spread
  const tooltipFormatter = (value: number) => {
    return formatCurrency(value);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{getTitle()}</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {userRole === "parent" && children.length > 0 && (
            <Select
              value={selectedChild || undefined}
              onValueChange={(value) => setSelectedChild(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select Child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.uid} value={child.uid}>
                    {child.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as any)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {expenses.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Expense Data</CardTitle>
            <CardDescription>
              {userRole === "parent"
                ? "No expenses have been logged by this child yet."
                : "You haven't logged any expenses yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {userRole === "child" && (
              <Button onClick={() => window.location.href = "/log-expense"}>
                Log Your First Expense
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
                <CardDescription>
                  {timeRange === "week"
                    ? "Last 7 days"
                    : timeRange === "month"
                    ? "Last 30 days"
                    : "Last 12 months"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getTotalSpending())}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                <CardDescription>Where most money is spent</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <>
                    <div className="text-xl font-bold">{categoryData.sort((a, b) => b.value - a.value)[0]?.name}</div>
                    <div className="text-muted-foreground">{formatCurrency(categoryData.sort((a, b) => b.value - a.value)[0]?.value)}</div>
                  </>
                ) : (
                  <div className="text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Expense Count</CardTitle>
                <CardDescription>Number of transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{expenses.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {chartType === "category" ? (
                    <PieChart className="h-5 w-5 text-primary" />
                  ) : (
                    <LineChart className="h-5 w-5 text-primary" />
                  )}
                  <CardTitle>Expense Analytics</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={chartType === "category" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setChartType("category")}
                  >
                    <PieChart className="h-4 w-4 mr-1" />
                    By Category
                  </Button>
                  <Button 
                    variant={chartType === "time" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setChartType("time")}
                  >
                    <LineChart className="h-4 w-4 mr-1" />
                    Over Time
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {chartType === "category" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={150}
                        fill="#8884d8"
                        label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipFormatter} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLine
                      data={timeSeriesData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 30,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={tooltipFormatter} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name="Spending"
                        stroke="#3B82F6"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                    </RechartsLine>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Analytics;
