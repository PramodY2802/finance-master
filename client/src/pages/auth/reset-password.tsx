import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useResetPassword } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { LockKeyhole, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const mutation = useResetPassword();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: "", password: "" },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md p-8 glass-panel rounded-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {mutation.isSuccess ? (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Password Reset!</h1>
            <p className="text-muted-foreground">Your password has been successfully updated.</p>
            <Button onClick={() => setLocation("/login")} className="w-full h-12 mt-4">
              Return to Login
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-foreground border border-border mb-6 shadow-lg">
                <LockKeyhole className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">New Password</h1>
              <p className="text-muted-foreground">Enter your token and new password</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="token">Reset Token</Label>
                <Input 
                  id="token" 
                  {...form.register("token")} 
                  className="bg-background/50 border-border/50 focus:border-primary h-12 font-mono text-sm"
                  placeholder="Paste your token here"
                />
                {form.formState.errors.token && (
                  <p className="text-sm text-destructive font-medium">{form.formState.errors.token.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  {...form.register("password")} 
                  className="bg-background/50 border-border/50 focus:border-primary h-12"
                  placeholder="••••••••"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive font-medium">{form.formState.errors.password.message}</p>
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
                {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
