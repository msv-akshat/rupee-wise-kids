
import { Badge } from "@/components/ui/badge";
import { Expense } from "@/types/models";
import { formatCurrency } from "@/lib/utils";

interface CategorySummaryProps {
  expenses: Expense[];
}

export const CategorySummary = ({ expenses }: CategorySummaryProps) => {
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

  return (
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
  );
};
