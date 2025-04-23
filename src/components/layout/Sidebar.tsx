
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  PieChart, 
  UserPlus, 
  FileText, 
  Settings, 
  Users, 
  MessageSquare, 
  IndianRupee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export default function Sidebar() {
  const { userRole } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  const parentLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/analytics", label: "Analytics", icon: PieChart },
    { href: "/create-child", label: "Add Child", icon: UserPlus },
    { href: "/manage-children", label: "Manage Children", icon: Users },
    { href: "/requests", label: "Requests", icon: MessageSquare },
  ];

  const childLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/analytics", label: "Analytics", icon: PieChart },
    { href: "/log-expense", label: "Log Expense", icon: IndianRupee },
    { href: "/expenses", label: "Expenses", icon: FileText },
    { href: "/send-request", label: "Send Request", icon: MessageSquare },
  ];

  const commonLinks = [
    { href: "/profile", label: "Profile", icon: Settings },
  ];
  
  const links = userRole === "parent" ? [...parentLinks, ...commonLinks] : [...childLinks, ...commonLinks];

  return (
    <aside 
      className={cn(
        "bg-card border-r h-full transition-all duration-300 flex flex-col",
        isCollapsed ? "w-[70px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "p-4 flex items-center",
        isCollapsed ? "justify-center" : "justify-start"
      )}>
        <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
          <IndianRupee size={20} />
        </div>
        {!isCollapsed && (
          <span className="ml-2 font-bold text-xl text-foreground">RupeeWise</span>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {links.map((link) => (
            <li key={link.href}>
              <NavLink 
                to={link.href}
                className={({ isActive }) => cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isCollapsed && "justify-center"
                )}
                end={link.href === "/dashboard"}
              >
                <link.icon size={20} className={cn(!isCollapsed && "mr-2")} />
                {!isCollapsed && <span>{link.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Toggle Button */}
      <div className={cn(
        "p-4 border-t", 
        isCollapsed ? "flex justify-center" : "flex justify-end"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 11L10 7.5L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11L5 7.5L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </Button>
      </div>
    </aside>
  );
}
