
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense, ExpenseCategory } from "@/types/models";
import { useAuth } from "@/contexts/AuthContext";

export const useExpensesData = () => {
  const { currentUser, userRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      
      try {
        let expensesData: Expense[] = [];
        
        if (userRole === 'parent') {
          // Fetch children first
          const childrenSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'children'));
          const childrenIds = childrenSnapshot.docs.map(doc => doc.id);
          
          if (childrenIds.length === 0) {
            setExpenses([]);
            setIsLoading(false);
            return;
          }
          
          // For each child, fetch their expenses
          for (const childId of childrenIds) {
            const childExpensesQuery = query(
              collection(db, 'expenses'),
              where('childId', '==', childId)
            );
            
            const expensesSnapshot = await getDocs(childExpensesQuery);
            const childExpenses = expensesSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                amount: data.amount as number,
                category: data.category as ExpenseCategory,
                description: data.description as string,
                date: data.date as Timestamp,
                userId: data.userId as string,
                childId: data.childId as string,
                createdAt: data.createdAt as Timestamp,
              };
            });
            
            expensesData = [...expensesData, ...childExpenses];
          }
        } else {
          // For child users, fetch their own expenses
          const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid)
          );
          
          const expensesSnapshot = await getDocs(expensesQuery);
          expensesData = expensesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              amount: data.amount as number,
              category: data.category as ExpenseCategory,
              description: data.description as string,
              date: data.date as Timestamp,
              userId: data.userId as string,
              childId: data.childId as string,
              createdAt: data.createdAt as Timestamp,
            };
          });
        }
        
        // Sort expenses by date (newest first)
        expensesData.sort((a, b) => {
          const dateA = a.date as Timestamp;
          const dateB = b.date as Timestamp;
          return dateB.toMillis() - dateA.toMillis();
        });
        
        console.log("Fetched expenses:", expensesData.length);
        setExpenses(expensesData);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [currentUser, userRole]);

  return { expenses, isLoading };
};
