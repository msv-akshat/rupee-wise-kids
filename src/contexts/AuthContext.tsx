
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";

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
  resetPassword: (email: string) => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<RupeeWiseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast: uiToast } = useToast();

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
      
      uiToast({
        title: "Account created successfully!",
        description: "Welcome to RupeeWise Kids.",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Registration failed. Please try again.";
      uiToast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Create child account function - fixed implementation
  const createChildAccount = async (email: string, password: string, name: string): Promise<string> => {
    if (!currentUser || userRole !== 'parent') {
      throw new Error("Only parent accounts can create child accounts");
    }

    setIsLoading(true);
    
    try {
      console.log("Starting child account creation process");
      
      // Store parent information
      const parentUid = currentUser.uid;
      const parentEmail = currentUser.email;
      
      // Create the child account directly through Firebase Admin SDK (simulated here)
      const childCredential = await createUserWithEmailAndPassword(auth, email, password);
      const childUid = childCredential.user.uid;
      
      console.log("Child account created with UID:", childUid);
      
      // Update child profile with name
      await updateProfile(childCredential.user, {
        displayName: name
      });
      
      console.log("Child profile updated with name:", name);
      
      // Sign out the child user (we'll sign back in as parent after)
      await signOut(auth);
      
      console.log("Signed out child user, now will sign back in as parent");
      
      // Sign back in as the parent
      await signInWithEmailAndPassword(auth, parentEmail!, password);
      
      console.log("Signed back in as parent, now creating Firestore documents");
      
      // Create child user document in Firestore
      await setDoc(doc(db, 'users', childUid), {
        uid: childUid,
        email,
        displayName: name,
        role: 'child',
        parentId: parentUid,
        createdAt: new Date().toISOString(),
      });
      
      console.log("Created child user document in Firestore");
      
      // Add child to parent's children collection
      await setDoc(doc(db, 'users', parentUid, 'children', childUid), {
        uid: childUid,
        email,
        displayName: name,
        createdAt: new Date().toISOString(),
      });
      
      console.log("Added child to parent's children collection");
      
      // Success
      toast.success(`Child account for ${name} created successfully!`);
      console.log("Child account creation completed successfully");
      
      return childUid;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to create child account. Please try again.";
      console.error("Error creating child account:", error);
      toast.error(errorMessage);
      
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
      toast.success("Logged in successfully!");
    } catch (error: any) {
      const errorMessage = error.message || "Login failed. Please check your credentials.";
      toast.error(errorMessage);
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
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error(error.message || "Logout failed");
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
      
      toast.success("Profile updated successfully");
      
      // Update local user state
      setCurrentUser({
        ...currentUser,
        displayName
      });
    } catch (error: any) {
      toast.error(error.message || "Profile update failed");
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
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Password update failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent. Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send password reset email");
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
    updateUserPassword,
    resetPassword
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
