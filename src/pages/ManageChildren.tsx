
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, doc, getDoc, updateDoc, Timestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil, Trash2, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tabs, TabsContent, TabsHeader, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Child {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string;
}

interface ChildDetails {
  expenses: any[];
  totalSpent: number;
  budgets: any[];
}

export default function ManageChildren() {
  const { currentUser } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childDetails, setChildDetails] = useState<ChildDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailView, setIsDetailView] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get child ID from URL query param if available
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const childId = queryParams.get('child');
    
    if (childId) {
      // Child ID is in the URL, we'll select this child when data is loaded
      console.log("Child ID from URL:", childId);
      return; // Exit early, we'll handle this in the fetchChildren function
    }
  }, [location.search]);

  const editForm = useForm({
    defaultValues: {
      displayName: "",
      email: ""
    },
    resolver: zodResolver(
      z.object({
        displayName: z.string().min(2, "Display name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email")
      })
    )
  });

  const budgetForm = useForm({
    defaultValues: {
      amount: "",
      period: "monthly"
    },
    resolver: zodResolver(
      z.object({
        amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
          message: "Amount must be a positive number",
        }),
        period: z.enum(["weekly", "monthly", "yearly"])
      })
    )
  });

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser) return;
      
      try {
        console.log("Fetching children for parent:", currentUser.uid);
        
        // Use query to get children collection
        const childrenRef = collection(db, 'users', currentUser.uid, 'children');
        const childrenSnapshot = await getDocs(childrenRef);
        
        console.log("Children collection snapshot size:", childrenSnapshot.size);
        console.log("Children documents:", childrenSnapshot.docs.map(doc => doc.id));
        
        if (childrenSnapshot.empty) {
          console.log("No children found for this parent");
          setChildren([]);
        } else {
          const childrenData = childrenSnapshot.docs.map(doc => {
            console.log("Child document data:", doc.id, doc.data());
            return {
              uid: doc.id,
              ...doc.data()
            } as Child;
          });
          
          console.log("Processed children data:", childrenData);
          setChildren(childrenData);
          
          // Check if we should auto-select a child from URL query
          const queryParams = new URLSearchParams(location.search);
          const childId = queryParams.get('child');
          
          if (childId) {
            const selectedChildData = childrenData.find(child => child.uid === childId);
            if (selectedChildData) {
              setSelectedChild(selectedChildData);
              fetchChildDetails(selectedChildData);
              setIsDetailView(true);
            } else {
              console.log("Child from URL not found in data:", childId);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching children:", error);
        toast.error("Failed to load children data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, [currentUser, location.search]);

  const fetchChildDetails = async (child: Child) => {
    if (!currentUser || !child) return;
    
    try {
      setIsLoading(true);
      
      // Fetch child's expenses
      const expensesQuery = query(
        collection(db, 'expenses'),
        // where('childId', '==', child.uid)
      );
      
      const expensesSnapshot = await getDocs(expensesQuery);
      
      // Filter client-side to avoid composite index issues
      const childExpenses = expensesSnapshot.docs
        .filter(doc => doc.data().childId === child.uid)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      
      // Calculate total spent
      const totalSpent = childExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
      
      // Fetch child's budgets
      const budgetsQuery = query(
        collection(db, 'budgets'),
        // where('childId', '==', child.uid)
      );
      
      const budgetsSnapshot = await getDocs(budgetsQuery);
      
      // Filter client-side
      const childBudgets = budgetsSnapshot.docs
        .filter(doc => doc.data().childId === child.uid)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      
      setChildDetails({
        expenses: childExpenses,
        totalSpent: totalSpent,
        budgets: childBudgets
      });
      
      console.log("Fetched child details:", {
        expenses: childExpenses.length,
        totalSpent,
        budgets: childBudgets.length
      });
      
    } catch (error) {
      console.error("Error fetching child details:", error);
      toast.error("Failed to load child details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChild = () => {
    navigate('/create-child');
  };

  const handleViewDetails = (child: Child) => {
    setSelectedChild(child);
    fetchChildDetails(child);
    setIsDetailView(true);
    
    // Update URL with child ID for direct linking
    navigate(`/manage-children?child=${child.uid}`);
  };

  const handleBackToList = () => {
    setIsDetailView(false);
    setSelectedChild(null);
    setChildDetails(null);
    
    // Remove child ID from URL
    navigate('/manage-children');
  };

  const handleEdit = (child: Child) => {
    setSelectedChild(child);
    editForm.reset({
      displayName: child.displayName,
      email: child.email
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateBudget = () => {
    if (!selectedChild) return;
    
    budgetForm.reset({
      amount: "",
      period: "monthly"
    });
    setIsBudgetDialogOpen(true);
  };

  const handleEditSubmit = async (data: any) => {
    if (!selectedChild || !currentUser) return;
    
    try {
      console.log("Updating child:", selectedChild.uid, data);
      
      // Get child document reference
      const childDocRef = doc(db, 'users', currentUser.uid, 'children', selectedChild.uid);
      
      // Update child document with new data
      await updateDoc(childDocRef, {
        displayName: data.displayName,
        email: data.email,
        updatedAt: Timestamp.now().toDate().toISOString()
      });
      
      // Update local state
      setChildren(prev => 
        prev.map(child => 
          child.uid === selectedChild.uid
            ? { ...child, displayName: data.displayName, email: data.email }
            : child
        )
      );
      
      if (selectedChild) {
        setSelectedChild({
          ...selectedChild,
          displayName: data.displayName,
          email: data.email
        });
      }
      
      toast.success("Child account updated successfully");
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating child:", error);
      toast.error("Failed to update child account");
    }
  };

  const handleBudgetSubmit = async (data: any) => {
    if (!selectedChild || !currentUser) return;
    
    try {
      // Create budget based on period
      const amount = Number(data.amount);
      const period = data.period;
      const now = new Date();
      let startDate: Date, endDate: Date;
      
      // Set appropriate dates based on budget period
      if (period === "weekly") {
        // Current week (Sunday to Saturday)
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else if (period === "monthly") {
        // Current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else { // yearly
        // Current year
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
      }
      
      const budgetData = {
        childId: selectedChild.uid,
        userId: currentUser.uid,
        amount: amount,
        period: period,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now()
      };
      
      console.log("Creating budget:", budgetData);
      
      // Add budget document
      const budgetRef = await addDoc(collection(db, "budgets"), budgetData);
      
      // Update local state if child details exist
      if (childDetails) {
        setChildDetails({
          ...childDetails,
          budgets: [
            ...childDetails.budgets,
            {
              id: budgetRef.id,
              ...budgetData
            }
          ]
        });
      }
      
      toast.success("Budget created successfully");
      setIsBudgetDialogOpen(false);
    } catch (error) {
      console.error("Error creating budget:", error);
      toast.error("Failed to create budget");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading && !isDetailView) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (isDetailView && selectedChild) {
    return (
      <div className="container mx-auto p-4 animate-in">
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Children
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{selectedChild.displayName}</h1>
            <p className="text-muted-foreground">{selectedChild.email}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(selectedChild)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
            <Button size="sm" onClick={handleCreateBudget}>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Name</div>
                    <div>{selectedChild.displayName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Email</div>
                    <div>{selectedChild.email}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Created</div>
                    <div>{formatDate(selectedChild.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Spending Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  ) : childDetails ? (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-muted-foreground">Total Spent</div>
                        <div className="font-semibold">{formatCurrency(childDetails.totalSpent)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-muted-foreground">Expense Count</div>
                        <div>{childDetails.expenses.length} expenses</div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-muted-foreground">Active Budgets</div>
                        <div>{childDetails.budgets.filter((b: any) => 
                          b.endDate.toDate() >= new Date()).length}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2 text-muted-foreground">No data available</div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/analytics?child=${selectedChild.uid}`)}>
                    View Analytics
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Expense History</CardTitle>
                <CardDescription>Recent expenses recorded by {selectedChild.displayName}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : childDetails && childDetails.expenses.length > 0 ? (
                  <div className="border rounded-md">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Category</th>
                          <th className="p-2 text-left">Description</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childDetails.expenses.sort((a: any, b: any) => 
                          b.date.toMillis() - a.date.toMillis()
                        ).slice(0, 5).map((expense: any) => (
                          <tr key={expense.id} className="border-b">
                            <td className="p-2">{formatDate(expense.date.toDate().toISOString())}</td>
                            <td className="p-2">
                              <span className="bg-muted rounded-full px-2 py-1 text-xs">
                                {expense.category}
                              </span>
                            </td>
                            <td className="p-2">{expense.description || "-"}</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(expense.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses recorded yet
                  </div>
                )}
              </CardContent>
              {childDetails && childDetails.expenses.length > 0 && (
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/analytics?child=${selectedChild.uid}`)}>
                    View All Expenses
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="budgets">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Budgets</CardTitle>
                  <CardDescription>Manage {selectedChild.displayName}'s budgets</CardDescription>
                </div>
                <Button size="sm" onClick={handleCreateBudget}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : childDetails && childDetails.budgets.length > 0 ? (
                  <div className="border rounded-md">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left">Period</th>
                          <th className="p-2 text-left">Start Date</th>
                          <th className="p-2 text-left">End Date</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childDetails.budgets.sort((a: any, b: any) => 
                          b.createdAt.toMillis() - a.createdAt.toMillis()
                        ).map((budget: any) => (
                          <tr key={budget.id} className="border-b">
                            <td className="p-2 capitalize">{budget.period}</td>
                            <td className="p-2">{formatDate(budget.startDate.toDate().toISOString())}</td>
                            <td className="p-2">{formatDate(budget.endDate.toDate().toISOString())}</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(budget.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No budgets set up yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Child Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Child Account</DialogTitle>
              <DialogDescription>
                Update the details for {selectedChild.displayName}'s account
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create Budget Dialog */}
        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Budget</DialogTitle>
              <DialogDescription>
                Set a new budget for {selectedChild.displayName}
              </DialogDescription>
            </DialogHeader>
            <Form {...budgetForm}>
              <form onSubmit={budgetForm.handleSubmit(handleBudgetSubmit)} className="space-y-4">
                <FormField
                  control={budgetForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Amount (₹)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Period</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Budget</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 animate-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Children</h1>
        <Button onClick={handleAddChild}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      {children.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Children Added Yet</CardTitle>
            <CardDescription>
              Start by adding a child account to manage their expenses
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={handleAddChild}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Your First Child
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.uid} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>{child.displayName}</CardTitle>
                <CardDescription>{child.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created on {formatDate(child.createdAt)}
                </p>
              </CardContent>
              <CardFooter className="bg-muted/50 flex justify-between">
                <Button variant="outline" size="sm" onClick={() => handleEdit(child)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleViewDetails(child)}>
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
