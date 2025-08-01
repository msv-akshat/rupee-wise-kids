
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Expense } from "@/types/models";
import { ExpenseSummary } from "@/components/expenses/ExpenseSummary";
import { ExpenseHistory } from "@/components/expenses/ExpenseHistory";

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
        console.log("Fetching expenses for user:", currentUser.uid);
        
        // Create base query without orderBy to avoid composite index issues
        const expensesQuery = query(
          collection(db, "expenses"),
          where("userId", "==", currentUser.uid)
        );
        
        const expensesSnapshot = await getDocs(expensesQuery);
        console.log("Expenses snapshot size:", expensesSnapshot.size);
        
        let expensesData = expensesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            amount: data.amount,
            category: data.category as Expense["category"],
            description: data.description,
            date: data.date,
            userId: data.userId,
            childId: data.childId,
            createdAt: data.createdAt,
          } as Expense;
        });

        // Apply timeframe filter client-side
        if (timeframe !== "all") {
          const now = new Date();
          const cutoffDate = timeframe === "week"
            ? new Date(now.setDate(now.getDate() - 7))
            : new Date(now.setDate(now.getDate() - 30));
          
          expensesData = expensesData.filter((expense) => {
            const expenseDate = expense.date instanceof Timestamp
              ? expense.date.toDate()
              : new Date(expense.date);
            return expenseDate >= cutoffDate;
          });
        }

        // Sort data client-side instead of using orderBy in the query
        expensesData.sort((a, b) => {
          const dateA = a.date instanceof Timestamp ? a.date : Timestamp.fromDate(new Date(a.date));
          const dateB = b.date instanceof Timestamp ? b.date : Timestamp.fromDate(new Date(b.date));
          return dateB.toMillis() - dateA.toMillis();
        });

        console.log("Processed expenses data:", expensesData);
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

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Expenses</h1>
        <Button onClick={handleAddExpense}>
          <Plus className="mr-2 h-4 w-4" />
          Log Expense
        </Button>
      </div>

      <ExpenseSummary
        expenses={expenses}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        totalExpenses={getTotalExpenses()}
      />

      <ExpenseHistory 
        expenses={expenses}
        onAddExpense={handleAddExpense}
      />
    </div>
  );
};

export default ExpenseView;
