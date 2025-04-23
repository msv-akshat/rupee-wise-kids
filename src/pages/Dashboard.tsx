
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  limit, 
  doc, 
  getDoc, 
  Timestamp,
  addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense, Budget, Child } from "@/types/models";
import { PieChart, BarChart, Plus, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [budgetInfo, setBudgetInfo] = useState<Budget | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return;
      
      try {
        console.log("Fetching dashboard data for user:", currentUser.uid, "with role:", userRole);
        
        // Different data fetching based on user role
        if (userRole === 'parent') {
          // Fetch parent's own expenses
          const parentExpensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            limit(5)
          );
          
          const parentExpensesSnapshot = await getDocs(parentExpensesQuery);
          console.log("Parent's expenses count:", parentExpensesSnapshot.size);
          
          const parentExpenses: Expense[] = parentExpensesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isParentExpense: true
          } as Expense));
          
          // Sort manually
          parentExpenses.sort((a, b) => {
            const dateA = a.date as Timestamp;
            const dateB = b.date as Timestamp;
            return dateB.toMillis() - dateA.toMillis();
          });

          // Fetch children for parent
          const childrenRef = collection(db, 'users', currentUser.uid, 'children');
          const childrenSnapshot = await getDocs(childrenRef);
          
          console.log("Parent's children count:", childrenSnapshot.size);
          
          const childrenData = childrenSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
          })) as Child[];
          
          setChildren(childrenData);

          // If there are children, fetch the first child's expenses and budget
          if (childrenData.length > 0) {
            const firstChildId = childrenData[0].uid;
            setSelectedChild(firstChildId);
            console.log("Fetching expenses for first child:", firstChildId);
            
            // Fetch recent expenses without orderBy
            const childExpensesQuery = query(
              collection(db, 'expenses'),
              where('childId', '==', firstChildId),
              limit(5)
            );
            
            const childExpensesSnapshot = await getDocs(childExpensesQuery);
            console.log("First child's expenses count:", childExpensesSnapshot.size);
            
            const childExpenses: Expense[] = childExpensesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              isChildExpense: true
            } as Expense));
            
            // Sort manually
            childExpenses.sort((a, b) => {
              const dateA = a.date as Timestamp;
              const dateB = b.date as Timestamp;
              return dateB.toMillis() - dateA.toMillis();
            });
            
            // Combine parent and child expenses, limiting to 5 most recent
            const allExpenses = [...parentExpenses, ...childExpenses]
              .sort((a, b) => {
                const dateA = a.date as Timestamp;
                const dateB = b.date as Timestamp;
                return dateB.toMillis() - dateA.toMillis();
              })
              .slice(0, 5);
              
            setRecentExpenses(allExpenses);
            
            // Calculate total spent
            const totalParent = parentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            const totalChild = childExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            setTotalSpent(totalParent + totalChild);
            
            // Fetch active budget for selected child
            const now = Timestamp.now();
            const budgetQuery = query(
              collection(db, 'budgets'),
              where('childId', '==', firstChildId),
              where('startDate', '<=', now),
              where('endDate', '>=', now),
              limit(1)
            );
            
            const budgetSnapshot = await getDocs(budgetQuery);
            
            if (!budgetSnapshot.empty) {
              const budgetData = {
                id: budgetSnapshot.docs[0].id,
                ...budgetSnapshot.docs[0].data(),
              } as Budget;
              
              setBudgetInfo(budgetData);
            } else {
              setBudgetInfo(null);
            }
          } else {
            setRecentExpenses(parentExpenses);
            setTotalSpent(parentExpenses.reduce((sum, expense) => sum + expense.amount, 0));
            setBudgetInfo(null);
          }
        } else if (userRole === 'child') {
          console.log("Fetching child's expenses");
          
          // Fetch child's expenses without orderBy
          const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            limit(5)
          );
          
          const expensesSnapshot = await getDocs(expensesQuery);
          console.log("Child's expenses count:", expensesSnapshot.size);
          
          let expensesData = expensesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Expense[];
          
          // Sort manually
          expensesData.sort((a, b) => {
            const dateA = a.date as Timestamp;
            const dateB = b.date as Timestamp;
            return dateB.toMillis() - dateA.toMillis();
          });
          
          setRecentExpenses(expensesData);
          
          // Calculate total spent
          const total = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
          setTotalSpent(total);
          
          // Fetch active budget
          const now = Timestamp.now();
          const budgetQuery = query(
            collection(db, 'budgets'),
            where('childId', '==', currentUser.uid),
            where('startDate', '<=', now),
            where('endDate', '>=', now),
            limit(1)
          );
          
          const budgetSnapshot = await getDocs(budgetQuery);
          
          if (!budgetSnapshot.empty) {
            const budgetData = {
              id: budgetSnapshot.docs[0].id,
              ...budgetSnapshot.docs[0].data(),
            } as Budget;
            
            setBudgetInfo(budgetData);
          } else {
            setBudgetInfo(null);
          }
          
          // Get parent info if available
          if (currentUser.parentId) {
            try {
              const parentDoc = await getDoc(doc(db, 'users', currentUser.parentId));
              if (parentDoc.exists()) {
                // You can store parent data if needed
                console.log("Parent data retrieved");
              }
            } catch (error) {
              console.error("Error fetching parent data:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, userRole]);

  // Handle create budget function
  const handleCreateBudget = async () => {
    if (userRole !== 'parent' || !selectedChild) {
      toast.error("You need to select a child to create a budget for");
      return;
    }

    try {
      // Navigate to budget creation page (to be implemented later)
      // For now, create a simple monthly budget as example
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      
      const budgetData = {
        childId: selectedChild,
        userId: currentUser?.uid,
        amount: 5000, // Default budget amount
        period: "monthly",
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, "budgets"), budgetData);
      toast.success("Budget created successfully!");
      
      // Update the budgetInfo state
      setBudgetInfo(budgetData as Budget);
    } catch (error) {
      console.error("Error creating budget:", error);
      toast.error("Failed to create budget");
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Format currency to INR
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Timestamp | Date) => {
    if (date instanceof Timestamp) {
      date = date.toDate();
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/analytics")}
          >
            <PieChart className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          {userRole === 'child' ? (
            <Button 
              onClick={() => navigate("/log-expense")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Log Expense
            </Button>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => navigate("/parent-expenses")}
              >
                <Receipt className="mr-2 h-4 w-4" />
                My Expenses
              </Button>
              <Button 
                onClick={() => navigate(children.length ? "/parent-log-expense" : "/create-child")}
              >
                {children.length ? <Plus className="mr-2 h-4 w-4" /> : null}
                {children.length ? "Log Expense" : "Add Child"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Budget Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <CardDescription>
              {budgetInfo ? `${budgetInfo.period.charAt(0).toUpperCase() + budgetInfo.period.slice(1)} Budget` : 'No active budget'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budgetInfo ? formatCurrency(budgetInfo.amount) : '₹0'}
            </div>
            {budgetInfo && (
              <div className="mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      totalSpent / budgetInfo.amount > 0.9 
                        ? 'bg-danger' 
                        : totalSpent / budgetInfo.amount > 0.7 
                        ? 'bg-warning' 
                        : 'bg-success'
                    }`}
                    style={{ width: `${Math.min((totalSpent / budgetInfo.amount) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <div>Spent: {formatCurrency(totalSpent)}</div>
                  <div>
                    {Math.round((totalSpent / budgetInfo.amount) * 100)}% used
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-1">
            {userRole === 'parent' && (
              <Button variant="outline" size="sm" className="w-full" onClick={handleCreateBudget}>
                {budgetInfo ? 'Update Budget' : 'Create Budget'}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Recent Spending Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Spending</CardTitle>
            <CardDescription>
              Your spending for {new Date().toLocaleString('default', { month: 'long' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </div>
            {recentExpenses.length > 0 && (
              <div className="mt-4 space-y-2">
                {recentExpenses.slice(0, 3).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <span className="capitalize">{expense.category}</span>
                      {expense.isParentExpense && userRole === 'parent' && (
                        <span className="ml-1 text-xs text-muted-foreground">(Your expense)</span>
                      )}
                      {expense.isChildExpense && userRole === 'parent' && (
                        <span className="ml-1 text-xs text-muted-foreground">(Child expense)</span>
                      )}
                    </div>
                    <div className="font-medium">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentExpenses.length === 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                No recent expenses found.
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate(
                userRole === 'child' ? 
                "/expenses" : 
                "/analytics"
              )}
            >
              View All
            </Button>
          </CardFooter>
        </Card>

        {/* Third Card - Different based on user role */}
        {userRole === 'parent' ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Children</CardTitle>
              <CardDescription>
                {children.length === 0 ? "No children added yet" : `Managing ${children.length} ${children.length === 1 ? 'child' : 'children'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children.length > 0 ? (
                <div className="space-y-2">
                  {children.map((child) => (
                    <div key={child.uid} className="flex justify-between items-center">
                      <div className="font-medium">{child.displayName}</div>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/manage-children?child=${child.uid}`)}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className="text-muted-foreground">
                    You haven't added any children yet
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-1">
              <Button 
                variant={children.length > 0 ? "outline" : "default"} 
                size="sm" 
                className="w-full"
                onClick={() => navigate("/create-child")}
              >
                Add Child
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Spending Categories</CardTitle>
              <CardDescription>
                Where your money is going
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentExpenses.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-center py-2">
                    <BarChart className="h-20 w-20 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className="text-muted-foreground">
                    No expenses recorded yet
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate("/analytics")}
              >
                View Analytics
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Activity Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="rounded-md border">
          {recentExpenses.length > 0 ? (
            <div className="divide-y">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {expense.description || `${expense.category} expense`}
                      {userRole === 'parent' && (
                        expense.isParentExpense ? 
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Your expense</span> :
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Child expense</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(expense.date)}</p>
                  </div>
                  <div className="font-bold">{formatCurrency(expense.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <h3 className="font-semibold text-lg mb-2">No recent activity</h3>
              <p className="text-muted-foreground mb-4">
                {userRole === 'child' 
                  ? "You haven't logged any expenses yet."
                  : "No expenses have been logged yet."}
              </p>
              {userRole === 'child' && (
                <Button onClick={() => navigate("/log-expense")}>
                  Log Your First Expense
                </Button>
              )}
              {userRole === 'parent' && (
                <Button onClick={() => navigate("/parent-log-expense")}>
                  Log Your First Expense
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
