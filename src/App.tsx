
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create-child" element={<CreateChild />} />
              
              {/* Add other routes here */}
              {/* <Route path="/analytics" element={<Analytics />} /> */}
              {/* <Route path="/manage-children" element={<ManageChildren />} /> */}
              {/* <Route path="/log-expense" element={<LogExpense />} /> */}
              {/* <Route path="/profile" element={<Profile />} /> */}
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
