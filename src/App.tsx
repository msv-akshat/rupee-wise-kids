
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateChild from "./pages/CreateChild";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/layout/MainLayout";
import Index from "./pages/Index";
import ManageChildren from "./pages/ManageChildren";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Requests from "./pages/Requests";
import LogExpense from "./pages/LogExpense";
import ExpenseView from "./pages/ExpenseView";
import SendRequest from "./pages/SendRequest";
import { useAuth } from "./contexts/AuthContext";

// Create query client
const queryClient = new QueryClient();

// Protected route component that checks user role
const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: Array<'parent' | 'child'>;
}) => {
  const { currentUser, userRole, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole as 'parent' | 'child')) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes with Layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              {/* Common Routes for Both Roles */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/analytics" element={<Analytics />} />
              
              {/* Parent-Only Routes */}
              <Route path="/create-child" element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <CreateChild />
                </ProtectedRoute>
              } />
              <Route path="/manage-children" element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ManageChildren />
                </ProtectedRoute>
              } />
              <Route path="/requests" element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <Requests />
                </ProtectedRoute>
              } />
              
              {/* Child-Only Routes */}
              <Route path="/log-expense" element={
                <ProtectedRoute allowedRoles={['child']}>
                  <LogExpense />
                </ProtectedRoute>
              } />
              <Route path="/expenses" element={
                <ProtectedRoute allowedRoles={['child']}>
                  <ExpenseView />
                </ProtectedRoute>
              } />
              <Route path="/send-request" element={
                <ProtectedRoute allowedRoles={['child']}>
                  <SendRequest />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
