
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IndianRupee, Receipt } from "lucide-react";
import { Child } from "@/types/models";

const expenseSchema = z.object({
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string().min(1, { message: "Please select a category" }),
  description: z.string().optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  expenseFor: z.string().min(1, { message: "Please select who this expense is for" }),
  childId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const categories = [
  "food",
  "transport",
  "education",
  "entertainment",
  "clothing",
  "health",
  "gifts",
  "other",
];

const ParentLogExpense = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser) return;
      
      try {
        const childrenSnapshot = await getDocs(
          collection(db, 'users', currentUser.uid, 'children')
        );
        
        const childrenData = childrenSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
        })) as Child[];
        
        setChildren(childrenData);
      } catch (error) {
        console.error("Error fetching children:", error);
        toast.error("Failed to load children");
      }
    };
    
    fetchChildren();
  }, [currentUser]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: "",
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
      expenseFor: "parent", // Default to parent expense
      childId: "",
    },
  });

  const watchExpenseFor = form.watch("expenseFor");

  const onSubmit = async (values: ExpenseFormValues) => {
    if (!currentUser) {
      toast.error("You must be logged in to log expenses");
      return;
    }

    setIsLoading(true);
    try {
      const isParentExpense = values.expenseFor === "parent";
      const selectedChildId = values.childId;
      
      const expenseData = {
        amount: Number(values.amount),
        category: values.category as any,
        description: values.description || "",
        date: Timestamp.fromDate(new Date(values.date)),
        userId: isParentExpense ? currentUser.uid : selectedChildId,
        childId: isParentExpense ? null : selectedChildId,
        createdAt: Timestamp.now(),
        isParentExpense: isParentExpense,
        isChildExpense: !isParentExpense,
        parentId: currentUser.uid
      };

      await addDoc(collection(db, "expenses"), expenseData);
      toast.success("Expense logged successfully!");
      
      // Reset form and navigate
      form.reset({
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        expenseFor: "parent",
        childId: "",
      });
      
      // Navigate to the appropriate page based on expense type
      navigate(isParentExpense ? "/parent-expenses" : "/analytics");
    } catch (error) {
      console.error("Error logging expense:", error);
      toast.error("Failed to log expense. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto animate-in">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Receipt className="h-6 w-6 text-primary" />
              <CardTitle>Log Expense</CardTitle>
            </div>
            <CardDescription>
              Track expenses for yourself or your children
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="expenseFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense For</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select who this expense is for" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="parent">Myself (Parent)</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {watchExpenseFor === "child" && (
                  <FormField
                    control={form.control}
                    name="childId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Child</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading || children.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a child" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {children.map((child) => (
                              <SelectItem key={child.uid} value={child.uid}>
                                {child.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="pl-10"
                            type="number"
                            placeholder="0"
                            {...field}
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What did you spend on?"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Logging Expense...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Log Expense
                    </span>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default ParentLogExpense;
