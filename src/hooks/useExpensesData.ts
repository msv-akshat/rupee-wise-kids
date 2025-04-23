
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
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
          const childrenSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'children'));
          const childrenIds = childrenSnapshot.docs.map(doc => doc.id);
          
          if (childrenIds.length === 0) {
            setExpenses([]);
            setIsLoading(false);
            return;
          }
          
          const expensesPromises = childrenIds.map(childId => 
            getDocs(query(
              collection(db, 'expenses'),
              where('childId', '==', childId),
              orderBy('date', 'desc')
            ))
          );
          
          const expensesSnapshots = await Promise.all(expensesPromises);
          expensesData = expensesSnapshots.flatMap(snapshot => 
            snapshot.docs.map(doc => {
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
            })
          );
        } else {
          const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
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
