
import { Timestamp } from "firebase/firestore";

export type ExpenseCategory = 
  | 'food' 
  | 'education' 
  | 'transport' 
  | 'entertainment' 
  | 'clothing' 
  | 'health' 
  | 'gifts' 
  | 'other';

export interface Expense {
  id: string;
  userId: string; // ID of the user who created the expense (child)
  childId?: string; // If created by parent for child
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  isParentExpense?: boolean; // Added for parent expenses
  isChildExpense?: boolean; // Added for child expenses
  parentId?: string; // ID of the parent if this is a child expense
}

export interface Budget {
  id: string;
  userId: string; // Parent ID
  childId: string;
  amount: number;
  period: 'weekly' | 'monthly';
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  categories?: Record<ExpenseCategory, number>; // Optional per-category limits
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Request {
  id: string;
  userId: string; // Child ID who created the request
  parentId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  responseMessage?: string;
}

export interface Child {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
}
