
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MoneyRequest {
  id: string;
  childId: string;
  childName: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

const Requests = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) return;
      
      try {
        // Get all children of current parent
        const childrenRef = collection(db, 'users', currentUser.uid, 'children');
        const childrenSnap = await getDocs(childrenRef);
        const childIds = childrenSnap.docs.map(doc => doc.id);
        
        console.log("Fetching requests for children:", childIds);
        
        if (childIds.length === 0) {
          setIsLoading(false);
          return;
        }
        
        // Query money_requests collection instead of money_requests
        const requestsRef = collection(db, 'money_requests');
        let requestsQuery;
        
        if (childIds.length === 1) {
          requestsQuery = query(
            requestsRef,
            where('parentId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          requestsQuery = query(
            requestsRef,
            where('parentId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        }
        
        const requestsSnap = await getDocs(requestsQuery);
        console.log("Money requests fetched:", requestsSnap.size);
        
        // Map children names to their requests
        const childrenData = childrenSnap.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id] = data.displayName;
          return acc;
        }, {} as Record<string, string>);
        
        const requestsList = requestsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            childId: data.childId,
            childName: childrenData[data.childId] || 'Unknown Child',
            amount: data.amount,
            reason: data.reason || "",
            status: data.status,
            createdAt: data.createdAt,
          } as MoneyRequest;
        });
        
        setRequests(requestsList);
        console.log("Processed requests:", requestsList);
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast.error("Failed to load money requests");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser]);

  const handleApprove = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'money_requests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: new Date()
      });
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'approved' } 
            : req
        )
      );
      
      toast.success("Money request approved");
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'money_requests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: new Date()
      });
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'rejected' } 
            : req
        )
      );
      
      toast.success("Money request rejected");
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: Timestamp) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp.toDate());
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
      <h1 className="text-2xl font-bold mb-6">Money Requests</h1>
      
      {requests.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Money Requests</CardTitle>
            <CardDescription>
              You have no pending money requests from your children
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{request.childName}</CardTitle>
                  <CardDescription>
                    Requested on {formatDate(request.createdAt)}
                  </CardDescription>
                </div>
                <Badge 
                  className={`${
                    request.status === 'pending' 
                      ? 'bg-yellow-500' 
                      : request.status === 'approved' 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  } text-white`}
                >
                  {request.status === 'pending' && (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {request.status === 'approved' && (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  )}
                  {request.status === 'rejected' && (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-xl font-bold flex items-center">
                    <IndianRupee className="h-4 w-4 mr-1" />
                    {formatCurrency(request.amount).replace('₹', '')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reason:</span>
                  <p className="mt-1">{request.reason}</p>
                </div>
              </CardContent>
              {request.status === 'pending' && (
                <CardFooter className="bg-muted/50 flex justify-between">
                  <Button variant="destructive" size="sm" onClick={() => handleReject(request.id)}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleApprove(request.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;
