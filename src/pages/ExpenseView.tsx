
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { IndianRupee, Plus, Receipt, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Timestamp;
  userId: string;
  childId?: string;
  createdAt: Timestamp;
}

const ExpenseView = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"all" | "week" | "month">("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentUser) return;

      try {
        setIsLoading(true);
        
        // Create a base query that works for both child and parent viewing child's expenses
        let baseQuery;
        
        if (currentUser.role === 'child') {
          // If the user is a child, show their expenses
          baseQuery = query(
            collection(db, "expenses"),
            where("userId", "==", currentUser.uid)
          );
        } else {
          // If parent role, this page shouldn't normally be accessed, but we'll handle it
          // For future functionality where parent might view child expenses
          baseQuery = query(
            collection(db, "expenses"),
            where("userId", "==", currentUser.uid)
          );
        }
        
        let expensesQuery = baseQuery;

        const now = new Date();
        
        if (timeframe === "week") {
          // Last 7 days
          const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          expensesQuery = query(
            baseQuery,
            where("date", ">=", Timestamp.fromDate(lastWeek))
          );
        } else if (timeframe === "month") {
          // Last 30 days
          const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          expensesQuery = query(
            baseQuery,
            where("date", ">=", Timestamp.fromDate(lastMonth))
          );
        }

        // Add orderBy after all where clauses
        expensesQuery = query(expensesQuery, orderBy("date", "desc"));
        
        console.log("Fetching expenses for user:", currentUser.uid, "with role:", currentUser.role);
        
        const expensesSnapshot = await getDocs(expensesQuery);
        console.log("Expenses snapshot size:", expensesSnapshot.size);
        
        const expensesData = expensesSnapshot.docs.map((doc) => {
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

        console.log("Expenses data:", expensesData);
        setExpenses(expensesData);
      } catch (error) {
        console.error("Error fetching expenses:", error);
        toast.error("Failed to load expenses");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [currentUser, timeframe]);

  const handleAddExpense = () => {
    navigate("/log-expense");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: Timestamp) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(timestamp.toDate());
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getCategoryExpenses = () => {
    const categories: Record<string, number> = {};
    expenses.forEach((expense) => {
      if (!categories[expense.category]) {
        categories[expense.category] = 0;
      }
      categories[expense.category] += expense.amount;
    });
    return categories;
  };

  const categoryExpenses = getCategoryExpenses();
  const totalExpenses = getTotalExpenses();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 animate-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Expenses</h1>
        <Button onClick={handleAddExpense}>
          <Plus className="mr-2 h-4 w-4" />
          Log Expense
        </Button>
      </div>

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
              <Tabs defaultValue={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
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
            <CardDescription>
              How your money is spent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(categoryExpenses).length > 0 ? (
                Object.entries(categoryExpenses)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Badge className="mr-2">{category}</Badge>
                      </div>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  ))
              ) : (
                <div className="text-center text-muted-foreground py-2">
                  No expenses recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-primary" />
            <CardTitle>Expense History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {expense.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your spending by logging your first expense
              </p>
              <Button onClick={handleAddExpense}>
                <Plus className="mr-2 h-4 w-4" />
                Log Your First Expense
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseView;
