
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Child {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export default function ManageChildren() {
  const { currentUser } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser) return;
      
      try {
        console.log("Fetching children for parent:", currentUser.uid);
        
        // Use query to get children collection
        const childrenRef = collection(db, 'users', currentUser.uid, 'children');
        const childrenSnapshot = await getDocs(childrenRef);
        
        console.log("Children collection snapshot size:", childrenSnapshot.size);
        console.log("Children documents:", childrenSnapshot.docs.map(doc => doc.id));
        
        if (childrenSnapshot.empty) {
          console.log("No children found for this parent");
          setChildren([]);
        } else {
          const childrenData = childrenSnapshot.docs.map(doc => {
            console.log("Child document data:", doc.id, doc.data());
            return {
              uid: doc.id,
              ...doc.data()
            } as Child;
          });
          
          console.log("Processed children data:", childrenData);
          setChildren(childrenData);
        }
      } catch (error) {
        console.error("Error fetching children:", error);
        toast.error("Failed to load children data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, [currentUser]);

  const handleAddChild = () => {
    navigate('/create-child');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 animate-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Children</h1>
        <Button onClick={handleAddChild}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      {children.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Children Added Yet</CardTitle>
            <CardDescription>
              Start by adding a child account to manage their expenses
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={handleAddChild}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Your First Child
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.uid} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>{child.displayName}</CardTitle>
                <CardDescription>{child.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created on {formatDate(child.createdAt)}
                </p>
              </CardContent>
              <CardFooter className="bg-muted/50 flex justify-between">
                <Button variant="outline" size="sm" onClick={() => toast.info("Edit functionality coming soon!")}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info("View details functionality coming soon!")}>
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
