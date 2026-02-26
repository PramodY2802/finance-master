import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForgotPassword } from "@/hooks/use-auth";
import { Link } from "wouter";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
});

export default function ForgotPassword() {
  const mutation = useForgotPassword();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "" },
  });

  const onSubmit = (data: { username: string }) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md p-8 glass-panel rounded-2xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
        </Link>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-foreground border border-border mb-6 shadow-lg">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Reset Password</h1>
          <p className="text-muted-foreground">Enter your username to receive a reset token</p>
        </div>

        {mutation.isSuccess ? (
          <div className="text-center space-y-6">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <p className="font-semibold mb-2">Token Generated</p>
              <code className="bg-background/80 px-3 py-2 rounded-lg font-mono text-sm block border border-border/50 break-all">
                {mutation.data?.token || "Check your database for token"}
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy this token. In a real app, this would be emailed to you.
            </p>
            <Button asChild className="w-full h-12">
              <Link href="/reset-password">Continue to Reset</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                {...form.register("username")} 
                className="bg-background/50 border-border/50 focus:border-primary h-12"
                placeholder="Enter your username"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive font-medium">{form.formState.errors.username.message as string}</p>
              )}
            </div>

            {mutation.error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center">
                {mutation.error.message}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Token"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
