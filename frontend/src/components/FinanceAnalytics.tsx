import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface FinanceAnalyticsProps {
    expenses: any[];
}

export default function FinanceAnalytics({ expenses }: FinanceAnalyticsProps) {
    // 1. Calculate Category Totals
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const pieData = Object.keys(categoryTotals).map(cat => ({
        name: cat,
        value: categoryTotals[cat]
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A29AFF'];

    // 2. Spending Trends (Mocking Monthly Data for now as we don't have historical dates)
    const barData = [
        { name: 'Week 1', amount: expenses.slice(0, 2).reduce((acc, e) => acc + e.amount, 0) || 50 },
        { name: 'Week 2', amount: expenses.slice(2, 5).reduce((acc, e) => acc + e.amount, 0) || 120 },
        { name: 'Week 3', amount: expenses.slice(5).reduce((acc, e) => acc + e.amount, 0) || 80 },
        { name: 'Week 4', amount: 45 },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-4 rounded-2xl border-2 border-brand-dark shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black text-lg mb-4 text-center">💸 Spending by Category</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-brand-dark shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black text-lg mb-4 text-center">📈 Weekly Trends</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="amount" fill="#FD7e14" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
