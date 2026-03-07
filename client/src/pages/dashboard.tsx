import { useMemo, useState } from "react";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLast30DaysRange, getMonthRange } from "@/lib/date-range";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

function formatCurrency(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  // use Indian rupee formatting
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num || 0);
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const [filterMode, setFilterMode] = useState<"last30" | "month">("last30");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const dateFilter = useMemo(() => {
    if (filterMode === "month") {
      return getMonthRange(selectedMonth);
    }

    return getLast30DaysRange();
  }, [filterMode, selectedMonth]);

  const { data, isLoading, error } = useDashboardStats(dateFilter);
  const rangeLabel = filterMode === "last30" ? "Last 30 Days" : format(new Date(`${selectedMonth}-01`), "MMMM yyyy");

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <p className="font-medium">Failed to load dashboard data. Please try again.</p>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { title: `${rangeLabel} Balance`, value: data.totalBalance, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { title: `${rangeLabel} Income`, value: data.totalIncome, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: `${rangeLabel} Expense`, value: data.totalExpense, icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "Selected Day Expense", value: data.todayExpense, icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Here's your enterprise financial summary.</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-4">
          <Button
            type="button"
            variant={filterMode === "last30" ? "default" : "outline"}
            onClick={() => setFilterMode("last30")}
            className="sm:w-auto"
          >
            Last 30 Days
          </Button>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setFilterMode("month");
            }}
            className="sm:w-[180px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50 hover-elevate overflow-hidden relative group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-full -z-10 transition-transform group-hover:scale-110`} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-bold">{formatCurrency(stat.value)}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Income vs Expense ({rangeLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {data.expenseVsIncome.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.expenseVsIncome} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="hsl(var(--chart-1))" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="hsl(var(--chart-2))" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {data.categoryExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryExpense}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="amount"
                      nameKey="category"
                      stroke="none"
                    >
                      {data.categoryExpense.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                 <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
            {data.categoryExpense.length > 0 && (
               <div className="flex flex-wrap justify-center gap-3 mt-4">
                 {data.categoryExpense.map((item, i) => (
                   <div key={item.category} className="flex items-center gap-2 text-xs text-muted-foreground">
                     <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                     {item.category}
                   </div>
                 ))}
               </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="bg-card/50 border-border/50 mb-8">
        <CardHeader>
          <CardTitle>Daily Expenses ({rangeLabel})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
             {data.dailyExpense.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyExpense} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
             )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
