import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, DollarSign, CalendarDays, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SalesMetrics {
  yearToDate: number;
  monthToDate: number;
  previousYear: number;
  previousMonth: number;
}

interface CustomerMetrics {
  totalCustomers: number;
  repeatCustomers: number;
  topCustomer: {
    name: string;
    appointmentCount: number;
    totalSpent: number;
  } | null;
}

const ReportsManager = () => {
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    yearToDate: 0,
    monthToDate: 0,
    previousYear: 0,
    previousMonth: 0
  });
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics>({
    totalCustomers: 0,
    repeatCustomers: 0,
    topCustomer: null
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const previousYear = currentYear - 1;
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousMonthYear = currentMonth === 0 ? previousYear : currentYear;

      // Year to date sales
      const yearStart = new Date(currentYear, 0, 1).toISOString();
      const { data: ytdSales } = await supabase
        .from('payments')
        .select('amount')
        .eq('salon_id', user.id)
        .eq('payment_status', 'completed')
        .gte('payment_date', yearStart);

      // Month to date sales  
      const monthStart = new Date(currentYear, currentMonth, 1).toISOString();
      const { data: mtdSales } = await supabase
        .from('payments')
        .select('amount')
        .eq('salon_id', user.id)
        .eq('payment_status', 'completed')
        .gte('payment_date', monthStart);

      // Previous year sales (same period)
      const prevYearStart = new Date(previousYear, 0, 1).toISOString();
      const prevYearEnd = new Date(previousYear, currentMonth, now.getDate()).toISOString();
      const { data: prevYearSales } = await supabase
        .from('payments')
        .select('amount')
        .eq('salon_id', user.id)
        .eq('payment_status', 'completed')
        .gte('payment_date', prevYearStart)
        .lte('payment_date', prevYearEnd);

      // Previous month sales
      const prevMonthStart = new Date(previousMonthYear, previousMonth, 1).toISOString();
      const prevMonthEnd = new Date(previousMonthYear, previousMonth + 1, 0).toISOString();
      const { data: prevMonthSales } = await supabase
        .from('payments')
        .select('amount')
        .eq('salon_id', user.id)
        .eq('payment_status', 'completed')
        .gte('payment_date', prevMonthStart)
        .lte('payment_date', prevMonthEnd);

      // Customer metrics
      const { data: allCustomers } = await supabase
        .from('clients')
        .select('id, name')
        .eq('salon_id', user.id);

      // Get appointment counts per customer
      const { data: appointmentCounts } = await supabase
        .from('appointments')
        .select(`
          client_id,
          clients(name),
          total_price
        `)
        .eq('salon_id', user.id)
        .eq('status', 'completed');

      // Process customer data
      const customerData = new Map();
      appointmentCounts?.forEach(appointment => {
        const clientId = appointment.client_id;
        const clientName = appointment.clients?.name || 'Unknown';
        const totalPrice = appointment.total_price || 0;
        
        if (!customerData.has(clientId)) {
          customerData.set(clientId, {
            name: clientName,
            appointmentCount: 0,
            totalSpent: 0
          });
        }
        
        const existing = customerData.get(clientId);
        existing.appointmentCount++;
        existing.totalSpent += totalPrice;
      });

      // Find repeat customers (2+ appointments)
      const repeatCustomers = Array.from(customerData.values())
        .filter(customer => customer.appointmentCount >= 2);

      // Find top customer by appointment count
      const topCustomer = Array.from(customerData.values())
        .sort((a, b) => b.appointmentCount - a.appointmentCount)[0] || null;

      setSalesMetrics({
        yearToDate: ytdSales?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
        monthToDate: mtdSales?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
        previousYear: prevYearSales?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
        previousMonth: prevMonthSales?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      });

      setCustomerMetrics({
        totalCustomers: allCustomers?.length || 0,
        repeatCustomers: repeatCustomers.length,
        topCustomer
      });

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast({
        title: "Error",
        description: "Failed to load reports data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const ytdGrowth = calculateGrowth(salesMetrics.yearToDate, salesMetrics.previousYear);
  const mtdGrowth = calculateGrowth(salesMetrics.monthToDate, salesMetrics.previousMonth);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Reports & Analytics</h2>
        <p className="text-muted-foreground">Business performance and customer insights</p>
      </div>

      {/* Sales Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Year to Date Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesMetrics.yearToDate)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {ytdGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
              )}
              <span className={ytdGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(ytdGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">vs last year</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month to Date Sales</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesMetrics.monthToDate)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {mtdGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
              )}
              <span className={mtdGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(mtdGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerMetrics.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Active client base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerMetrics.repeatCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {customerMetrics.totalCustomers > 0 
                ? `${((customerMetrics.repeatCustomers / customerMetrics.totalCustomers) * 100).toFixed(1)}% retention`
                : 'No data yet'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Customer
          </CardTitle>
          <CardDescription>
            Most loyal customer by appointment frequency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <div className="text-muted-foreground">Loading customer data...</div>
            </div>
          ) : customerMetrics.topCustomer ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium text-lg">{customerMetrics.topCustomer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {customerMetrics.topCustomer.appointmentCount} appointments
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(customerMetrics.topCustomer.totalSpent)}</div>
                <Badge variant="secondary">Top Customer</Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-muted-foreground">No customer data available yet</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
          <CardDescription>Key business highlights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Customer Loyalty</h4>
              <p className="text-sm text-muted-foreground">
                {customerMetrics.totalCustomers > 0 
                  ? `${((customerMetrics.repeatCustomers / customerMetrics.totalCustomers) * 100).toFixed(1)}% of your customers are repeat clients`
                  : 'Start serving customers to see loyalty metrics'
                }
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Revenue Growth</h4>
              <p className="text-sm text-muted-foreground">
                {salesMetrics.yearToDate > salesMetrics.previousYear 
                  ? `Your revenue is up ${ytdGrowth.toFixed(1)}% compared to last year`
                  : salesMetrics.previousYear > 0 
                    ? `Revenue is down ${Math.abs(ytdGrowth).toFixed(1)}% compared to last year`
                    : 'Start completing appointments to track revenue growth'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsManager;