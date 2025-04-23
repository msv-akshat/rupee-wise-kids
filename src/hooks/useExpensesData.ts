
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
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
        console.log("Fetching expenses for user:", currentUser.uid, "with role:", userRole);
        let expensesData: Expense[] = [];
        
        if (userRole === 'parent') {
          // Fetch parent's own expenses first
          const parentExpensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid)
          );
          
          const parentExpensesSnapshot = await getDocs(parentExpensesQuery);
          console.log("Parent's personal expenses count:", parentExpensesSnapshot.size);
          
          const parentExpenses = parentExpensesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              amount: data.amount as number,
              category: data.category as ExpenseCategory,
              description: data.description as string,
              date: data.date as Timestamp,
              userId: data.userId as string,
              childId: data.childId as string || null,
              createdAt: data.createdAt as Timestamp,
              isParentExpense: true,
            };
          });
          
          expensesData = [...expensesData, ...parentExpenses];
          
          // Fetch children's expenses
          const childrenSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'children'));
          const childrenIds = childrenSnapshot.docs.map(doc => doc.id);
          
          console.log("Parent's children IDs:", childrenIds);
          
          // For each child, fetch their expenses
          for (const childId of childrenIds) {
            console.log("Fetching expenses for child:", childId);
            
            const childExpensesQuery = query(
              collection(db, 'expenses'),
              where('childId', '==', childId)
            );
            
            const expensesSnapshot = await getDocs(childExpensesQuery);
            console.log("Child expenses snapshot size:", expensesSnapshot.size);
            
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
                isChildExpense: true,
              };
            });
            
            expensesData = [...expensesData, ...childExpenses];
          }
        } else {
          // For child users, fetch their own expenses
          console.log("Fetching expenses for child user:", currentUser.uid);
          
          const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid)
          );
          
          const expensesSnapshot = await getDocs(expensesQuery);
          console.log("Child expenses snapshot size:", expensesSnapshot.size);
          
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
          const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
          const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
          return dateB - dateA;
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
