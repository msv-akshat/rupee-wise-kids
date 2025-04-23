
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from "@/components/ui/use-toast";

// Define user roles
export type UserRole = 'parent' | 'child';

// Define user type with extended properties
export interface RupeeWiseUser extends User {
  role?: UserRole;
  displayName: string | null;
  parentId?: string;
}

// Define auth context type
interface AuthContextType {
  currentUser: RupeeWiseUser | null;
  userRole: UserRole | null;
  isLoading: boolean;
  register: (email: string, password: string, name: string) => Promise<void>;
  createChildAccount: (email: string, password: string, name: string) => Promise<string>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<RupeeWiseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Effect for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          if (userData) {
            const extendedUser: RupeeWiseUser = {
              ...user,
              role: userData.role as UserRole,
              parentId: userData.parentId,
            };
            setCurrentUser(extendedUser);
            setUserRole(userData.role as UserRole);
          } else {
            setCurrentUser(user as RupeeWiseUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setCurrentUser(user as RupeeWiseUser);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Register function - only for parents
  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName: name,
        role: 'parent',
        createdAt: new Date().toISOString(),
      });
      
      toast({
        title: "Account created successfully!",
        description: "Welcome to RupeeWise Kids.",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Registration failed. Please try again.";
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Create child account function
  const createChildAccount = async (email: string, password: string, name: string) => {
    if (!currentUser || userRole !== 'parent') {
      throw new Error("Only parent accounts can create child accounts");
    }

    setIsLoading(true);
    try {
      // Create account temporarily
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const childUid = userCredential.user.uid;
      
      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create child user document
      await setDoc(doc(db, 'users', childUid), {
        uid: childUid,
        email,
        displayName: name,
        role: 'child',
        parentId: currentUser.uid,
        createdAt: new Date().toISOString(),
      });
      
      // Add child to parent's children collection
      await setDoc(doc(db, 'users', currentUser.uid, 'children', childUid), {
        uid: childUid,
        email,
        displayName: name,
        createdAt: new Date().toISOString(),
      });
      
      // Sign out the child account and sign back in as parent
      await signOut(auth);
      await signInWithEmailAndPassword(auth, currentUser.email!, password);
      
      toast({
        title: "Child account created!",
        description: `${name}'s account has been set up successfully.`,
      });
      
      return childUid;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to create child account. Please try again.";
      toast({
        variant: "destructive",
        title: "Account creation failed",
        description: errorMessage,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Logged in successfully!",
        description: "Welcome back to RupeeWise Kids.",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Login failed. Please check your credentials.";
      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMessage,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      toast({
        title: "Logged out successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile function
  const updateUserProfile = async (displayName: string) => {
    if (!currentUser) throw new Error("No authenticated user");
    
    setIsLoading(true);
    try {
      await updateProfile(currentUser, { displayName });
      
      // Update Firestore user document
      await setDoc(doc(db, 'users', currentUser.uid), {
        displayName
      }, { merge: true });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      // Update local user state
      setCurrentUser({
        ...currentUser,
        displayName
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update password function
  const updateUserPassword = async (newPassword: string) => {
    if (!currentUser) throw new Error("No authenticated user");
    
    setIsLoading(true);
    try {
      await updatePassword(currentUser, newPassword);
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Password update failed",
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value: AuthContextType = {
    currentUser,
    userRole,
    isLoading,
    register,
    createChildAccount,
    login,
    logout,
    updateUserProfile,
    updateUserPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
