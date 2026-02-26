import { Layout } from "@/components/layout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { data: user } = useUser();

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your enterprise account settings.</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>View your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username || ''} disabled className="bg-secondary/50 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={user?.role?.toUpperCase() || ''} disabled className="bg-secondary/50 cursor-not-allowed font-mono text-sm" />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Note: Profile modifications are restricted in this environment. Contact your system administrator to change details.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-colors">
              Delete Account Data
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will permanently delete all your financial records and categories.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
