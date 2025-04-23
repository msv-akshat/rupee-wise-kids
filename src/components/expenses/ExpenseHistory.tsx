
import { Receipt, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Expense } from "@/types/models";
import { formatCurrency } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

interface ExpenseHistoryProps {
  expenses: Expense[];
  onAddExpense: () => void;
}

export const ExpenseHistory = ({ expenses, onAddExpense }: ExpenseHistoryProps) => {
  const formatDate = (timestamp: Timestamp) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(timestamp.toDate());
  };

  return (
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
                      {formatDate(expense.date as Timestamp)}
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
            <Button onClick={onAddExpense}>
              <Plus className="mr-2 h-4 w-4" />
              Log Your First Expense
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
