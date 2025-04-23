
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BadgeIndianRupee, Send } from "lucide-react";

const requestSchema = z.object({
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  reason: z.string().min(5, { message: "Please provide a reason for your request" }),
});

type RequestFormValues = z.infer<typeof requestSchema>;

const SendRequest = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      amount: "",
      reason: "",
    },
  });

  const onSubmit = async (values: RequestFormValues) => {
    if (!currentUser || !currentUser.parentId) {
      toast.error("You must be logged in as a child with a parent account to send requests");
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        amount: Number(values.amount),
        reason: values.reason,
        childId: currentUser.uid,
        parentId: currentUser.parentId,
        status: "pending",
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "money_requests"), requestData);
      toast.success("Money request sent to your parent!");
      
      // Reset form and navigate back
      form.reset();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error sending money request:", error);
      toast.error("Failed to send request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto animate-in">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BadgeIndianRupee className="h-6 w-6 text-primary" />
              <CardTitle>Request Money</CardTitle>
            </div>
            <CardDescription>
              Send a money request to your parent
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <BadgeIndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="pl-10"
                            type="number"
                            placeholder="0"
                            {...field}
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Request</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explain why you need the money..."
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending Request...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Request
                    </span>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SendRequest;
