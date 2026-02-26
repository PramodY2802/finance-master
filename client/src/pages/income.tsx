import { useState } from "react";
import { Layout } from "@/components/layout";
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from "@/hooks/use-income";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableCell, TableHead, TableHeader, TableRow, TableBody } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Income() {
  const { data: incomes, isLoading } = useIncomes();
  const { data: categories } = useCategories();
  const incomeCategories = categories?.filter(c => c.type === 'income') || [];
  
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const deleteMutation = useDeleteIncome();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, categoryId: 0, date: format(new Date(), 'yyyy-MM-dd'), description: "" },
  });

  const openEdit = (item: any) => {
    setEditingId(item.id);
    form.reset({ 
      amount: parseFloat(item.amount), 
      categoryId: item.categoryId, 
      date: format(new Date(item.date), 'yyyy-MM-dd'), 
      description: item.description || "" 
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ amount: 0, categoryId: 0, date: format(new Date(), 'yyyy-MM-dd'), description: "" });
    setIsOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data }, { onSuccess: () => setIsOpen(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => setIsOpen(false) });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Delete this income record?")) {
      deleteMutation.mutate(id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-500">Income</h1>
          <p className="text-muted-foreground mt-1">Track your revenue streams.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20">
              <Plus className="w-4 h-4 mr-2" /> Add Income
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Income" : "Add Income"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input type="number" step="0.01" id="amount" {...form.register("amount")} className="bg-background/50" />
                  {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input type="date" id="date" {...form.register("date")} className="bg-background/50" />
                  {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select onValueChange={(val) => form.setValue("categoryId", parseInt(val))} value={form.watch("categoryId").toString()}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" {...form.register("description")} className="bg-background/50" />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? "Save Changes" : "Save Income"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : incomes?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No income records found.</TableCell></TableRow>
            ) : (
              incomes?.map((item) => (
                <TableRow key={item.id} className="border-border/50 hover:bg-muted/20">
                  <TableCell className="text-sm">{format(new Date(item.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell><span className="px-2.5 py-1 rounded-md bg-secondary text-xs font-medium">{item.category?.name || "Unknown"}</span></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.description || "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-500">₹{parseFloat(item.amount as string).toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}
