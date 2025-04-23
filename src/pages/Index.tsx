
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { IndianRupee } from "lucide-react";

const Index = () => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
              <IndianRupee size={16} />
            </div>
            <span className="font-bold text-xl">RupeeWise Kids</span>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => navigate("/login")}>Login</Button>
            <Button onClick={() => navigate("/register")}>Register</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center bg-gradient-to-br from-background to-muted">
        <div className="container mx-auto px-4 py-12 md:py-24 lg:py-32">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Teach Financial Literacy <span className="text-primary">to your children</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                RupeeWise Kids helps parents track expenses, set budgets and teach financial responsibility to children in a fun and engaging way.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate("/register")}>Get Started</Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  Log in
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-secondary opacity-75 blur-xl animate-pulse"></div>
                <div className="relative flex items-center justify-center bg-card rounded-3xl p-8 shadow-lg">
                  <div className="space-y-8 w-full max-w-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">Monthly Budget</h3>
                        <span className="text-xl font-bold">₹5,000</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success" style={{ width: '40%' }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <div>Spent: ₹2,000</div>
                        <div>40% used</div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-semibold">Recent Expenses</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="text-sm">School Books</div>
                          <div className="font-medium">₹850</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm">Lunch</div>
                          <div className="font-medium">₹200</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm">Bus Pass</div>
                          <div className="font-medium">₹950</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card py-12 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              RupeeWise Kids helps parents and children manage expenses, set budgets, and learn financial responsibility together.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-background p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <IndianRupee className="text-primary" />
              </div>
              <h3 className="font-semibold text-xl mb-2">Expense Tracking</h3>
              <p className="text-muted-foreground">
                Children can log expenses and parents can monitor spending habits.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Budget Management</h3>
              <p className="text-muted-foreground">
                Set weekly or monthly budgets to help children learn financial planning.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M12 2v20"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Analytics</h3>
              <p className="text-muted-foreground">
                Visualize spending patterns and trends with easy-to-understand charts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} RupeeWise Kids. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
