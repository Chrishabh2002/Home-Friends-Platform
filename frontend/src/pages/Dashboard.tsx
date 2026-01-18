import { useState, useEffect } from "react";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, LogOut, Trash2, DollarSign, CheckCircle, XCircle, Plus } from "lucide-react";
import Chat from "../components/Chat";
import Confetti from 'react-confetti';
import { Toaster, toast } from 'sonner';


interface Task {
    id: string;
    title: string;
    status: "pending" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";
    points: number;
    recurrence?: string;
}



interface LeaderboardMember {
    user_id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    points: number;
}

import CalendarView from '../components/CalendarView';
import FinanceAnalytics from '../components/FinanceAnalytics';
import MobileNav from '../components/MobileNav';

export default function Dashboard() {
    // Auth
    const { user, logout } = useAuthStore();
    const [group, setGroup] = useState<any>(null);

    // Tasks State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskRecurrence, setNewTaskRecurrence] = useState("");

    // Calendar State
    const [showCalendar, setShowCalendar] = useState(false); // "" | daily | weekly | monthly

    const [showConfetti, setShowConfetti] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);

    // Expenses State
    const [expenses, setExpenses] = useState<{ id: string, description: string, amount: number, category: string, is_subscription: boolean, billing_day?: number }[]>([]);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "Grocery", is_subscription: false, billing_day: "" });

    // Smart Split State
    const [showBalances, setShowBalances] = useState(false);
    const [balances, setBalances] = useState<{ total: number, share_per_person: number, transfers: { from: string, to: string, amount: number }[] }>({ total: 0, share_per_person: 0, transfers: [] });

    // Chat is now always visible as floating widget - no state needed


    // Rewards State
    const [viewMode, setViewMode] = useState<'tasks' | 'rewards' | 'pantry'>('tasks');
    const [rewards, setRewards] = useState<{ id: string, title: string, cost: number, description: string }[]>([]);
    const [newReward, setNewReward] = useState({ title: "", cost: 50 });
    const [myPoints, setMyPoints] = useState(0);

    // Pantry & Shopping State
    const [pantryItems, setPantryItems] = useState<{ id: string, name: string, quantity: number }[]>([]);
    const [shoppingList, setShoppingList] = useState<{ id: string, name: string, is_checked: boolean }[]>([]);
    const [newItemName, setNewItemName] = useState("");
    const [smartInput, setSmartInput] = useState("");

    // NEW FEATURES State
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [showAchievements, setShowAchievements] = useState(false);

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const showNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/vite.svg' });
        }
    };

    const fetchPendingApprovals = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/tasks/pending-approvals");
            setPendingApprovals(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchAchievements = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/achievements/");
            setAchievements(res.data);
        } catch (e) { console.error(e); }
    };

    const checkNewAchievements = async () => {
        try {
            const res = await axios.post("http://localhost:8000/api/v1/achievements/check");
            if (res.data.newly_earned && res.data.newly_earned.length > 0) {
                res.data.newly_earned.forEach((ach: any) => {
                    toast.success(`🎉 Achievement Unlocked: ${ach.icon} ${ach.name}!`, { duration: 5000 });
                    showNotification('Achievement Unlocked!', `${ach.icon} ${ach.name}: ${ach.description}`);
                });
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 5000);
                fetchAchievements();
            }
        } catch (e) { console.error(e); }
    };

    const handleApproveTask = async (taskId: string, approved: boolean) => {
        try {
            await axios.put(`http://localhost:8000/api/v1/tasks/${taskId}/approve?approved=${approved}`);
            toast.success(approved ? 'Task approved! ✅' : 'Task rejected ❌');
            showNotification(approved ? 'Task Approved' : 'Task Rejected', approved ? 'Points awarded!' : 'Task reset to pending');
            fetchPendingApprovals();
            fetchTasks();
            fetchPoints();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Error');
        }
    };

    const handleCompleteWithProof = async (taskId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                await axios.post(`http://localhost:8000/api/v1/tasks/${taskId}/proof`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('📸 Proof uploaded! Awaiting approval');
                showNotification('Proof Uploaded', 'Your task is now pending admin approval');
                fetchTasks();
                fetchPendingApprovals();
            } catch (e: any) {
                toast.error(e.response?.data?.detail || 'Failed to upload proof');
            }
        };
        input.click();
    };


    const fetchPoints = async () => {
        if (!group) return;
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/groups/${group.id}/members`);
            const me = res.data.find((m: any) => m.user_id === useAuthStore.getState().user?.id);
            if (me) setMyPoints(me.points || 0);
        } catch (e) { }
    }

    const fetchRewards = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/rewards/");
            setRewards(res.data);
        } catch (e) { console.error(e); }
    }

    const createReward = async () => {
        try {
            await axios.post("http://localhost:8000/api/v1/rewards/", { ...newReward });
            setNewReward({ title: "", cost: 50 });
            fetchRewards();
            toast.success("Reward created!");
        } catch (e) { console.error(e); }
    }

    const claimReward = async (id: string) => {
        try {
            await axios.post(`http://localhost:8000/api/v1/rewards/${id}/claim`);
            toast.success("Reward Claimed! Pending approval.");
            fetchPoints();
            fetchPendingRedemptions();
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Error claiming");
        }
    }

    // Admin Approvals
    const [pendingRedemptions, setPendingRedemptions] = useState<{ id: string, user_name: string, reward_title: string, reward_cost: number, status: string }[]>([]);

    const fetchPendingRedemptions = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/rewards/redemptions/pending");
            setPendingRedemptions(res.data);
        } catch (e) { }
    }

    const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await axios.put(`http://localhost:8000/api/v1/rewards/redemptions/${id}?status=${status}`);
            fetchPendingRedemptions();
            toast.success(`Request ${status}!`);
            if (status === 'rejected') fetchPoints();
        } catch (e) { console.error(e); }
    }

    useEffect(() => {
        if (viewMode === 'rewards') {
            fetchPendingRedemptions();
        }
        if (viewMode === 'pantry') {
            fetchPantry();
            fetchShoppingList();
        }
    }, [viewMode]);

    // Pantry Logic
    const fetchPantry = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/pantry/items");
            setPantryItems(res.data);
        } catch (e) { }
    }

    const fetchShoppingList = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/pantry/shopping-list");
            setShoppingList(res.data);
        } catch (e) { }
    }

    const addToPantry = async () => {
        if (!newItemName) return;
        try {
            await axios.post("http://localhost:8000/api/v1/pantry/items", { name: newItemName });
            setNewItemName("");
            fetchPantry();
            toast.success("Added to Pantry");
        } catch (e) { }
    }

    const addToShopping = async () => {
        if (!newItemName) return;
        try {
            await axios.post("http://localhost:8000/api/v1/pantry/shopping-list", { name: newItemName });
            setNewItemName("");
            fetchShoppingList();
            toast.success("Added to Shopping List");
        } catch (e) { }
    }

    const toggleShopping = async (id: string) => {
        try {
            await axios.put(`http://localhost:8000/api/v1/pantry/shopping-list/${id}/toggle`);
            fetchShoppingList();
        } catch (e) { }
    }

    const moveToPantry = async (id: string) => {
        try {
            await axios.post(`http://localhost:8000/api/v1/pantry/shopping-list/${id}/move-to-pantry`);
            fetchShoppingList();
            toast.success("Moved to Pantry! 🏠");
        } catch (e) { }
    }

    const handleSmartCommand = async (text: string) => {
        if (!text) return;
        try {
            const res = await axios.post("http://localhost:8000/api/v1/smart/process", { text });
            toast.success(res.data.message);
            if (res.data.type === 'task') fetchTasks();
            if (res.data.type === 'expense') fetchExpenses();
        } catch (e) { toast.error("AI unsure what to do"); }
    }

    // Check for Groups
    useEffect(() => {
        const checkGroup = async () => {
            try {
                const res = await axios.get("http://localhost:8000/api/v1/groups/my");
                if (res.data.length === 0) {
                    window.location.href = "/setup";
                } else {
                    setGroup(res.data[0]);
                }
            } catch (err) {
                console.error(err);
            }
        }
        checkGroup();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/tasks/");
            setTasks(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    const createTask = async () => {
        if (!newTaskTitle) return;
        try {
            await axios.post("http://localhost:8000/api/v1/tasks/", {
                title: newTaskTitle,
                priority: "medium",
                points: 10,
                recurrence: newTaskRecurrence || null
            });
            setNewTaskTitle("");
            setNewTaskRecurrence("");
            fetchTasks();
            toast.success("Task created!");
        } catch (err) {
            console.error(err);
        }
    }

    const updateStatus = async (id: string, status: string) => {
        try {
            await axios.put(`http://localhost:8000/api/v1/tasks/${id}?status=${status}`);
            fetchTasks();
            if (status === 'completed') {
                fetchPoints();
                setShowConfetti(true);
                toast.success("Task Completed! +10 Points 🌟");
                setTimeout(() => setShowConfetti(false), 4000);
                // Check for new achievements
                await checkNewAchievements();
            }
        } catch (err) {
            console.error(err);
        }
    }

    const deleteTask = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await axios.delete(`http://localhost:8000/api/v1/tasks/${id}`);
            fetchTasks();
            toast("Task deleted");
        } catch (e) { console.error(e); }
    }

    const fetchExpenses = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/expenses/");
            setExpenses(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    const handleCreateExpense = async () => {
        try {
            await axios.post("http://localhost:8000/api/v1/expenses", {
                description: newExpense.description,
                amount: parseFloat(newExpense.amount),
                category: newExpense.category,
                is_subscription: newExpense.is_subscription,
                billing_day: newExpense.billing_day ? parseInt(newExpense.billing_day) : null
            });
            setShowExpenseForm(false);
            setNewExpense({ description: "", amount: "", category: "Grocery", is_subscription: false, billing_day: "" });
            fetchExpenses();
            toast.success("Expense added");
        } catch (err) {
            console.error(err);
        }
    }

    // Smart Split Logic
    const fetchBalances = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/expenses/balances");
            setBalances(res.data);
            setShowBalances(true);
        } catch (e) { console.error(e); }
    }

    const handleSettle = async () => {
        if (!window.confirm("This will delete all current expenses. Everyone settled up?")) return;
        try {
            await axios.post("http://localhost:8000/api/v1/expenses/settle");
            fetchBalances(); // close or refresh
            fetchExpenses();
            setShowBalances(false);
            toast.success("All debts settled! 🤝");
        } catch (e) { console.error(e); }
    }

    const fetchLeaderboard = async () => {
        if (!group) return;
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/groups/${group.id}/leaderboard`);
            setLeaderboard(res.data);
        } catch (e) { console.error(e); }
    }

    // Initial Fetch
    useEffect(() => {
        if (group) {
            fetchTasks();
            fetchExpenses();
            fetchPoints();
            fetchRewards();
            fetchLeaderboard();
            fetchPendingApprovals();
            fetchAchievements();
        }
    }, [group]);

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen bg-brand-light relative">
            <Toaster position="top-center" />
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl text-brand-primary font-black">{group?.name || "Home Dashboard"} 🏡</h1>
                    <div className="flex items-center gap-2 mt-2 text-gray-600">
                        <span className="font-bold">Invite Code:</span>
                        <code className="bg-gray-200 px-2 py-1 rounded text-brand-dark font-mono text-lg">{group?.invite_code || "..."}</code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(group?.invite_code || "");
                                toast.success("Copied to clipboard!");
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition"
                            title="Copy Code"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                    {/* Chat button removed - floating chat is always visible */}


                    {/* Achievements Button */}
                    <button
                        onClick={() => setShowAchievements(!showAchievements)}
                        className="flex items-center gap-2 px-4 py-3 bg-yellow-100 text-yellow-800 rounded-xl font-bold border-2 border-brand-dark hover:bg-yellow-200 transition-colors relative"
                    >
                        🏆 Badges
                        {achievements.filter(a => a.earned_at).length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
                                {achievements.filter(a => a.earned_at).length}
                            </span>
                        )}
                    </button>

                    {/* Calendar Button */}


                    {/* Pending Approvals Indicator */}
                    {pendingApprovals.length > 0 && (
                        <button
                            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                            className="flex items-center gap-2 px-4 py-3 bg-orange-100 text-orange-800 rounded-xl font-bold border-2 border-brand-dark hover:bg-orange-200 transition-colors animate-pulse"
                        >
                            📸 {pendingApprovals.length} Pending
                        </button>
                    )}

                    {/* Points Display Widget */}
                    <div className="flex flex-col items-center justify-center bg-brand-yellow px-4 py-2 rounded-xl border-2 border-brand-dark min-w-[100px]">
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-dark/60">My Wallet</span>
                        <span className="text-2xl font-black">{myPoints} 🪙</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowExpenseForm(true)}
                            className="flex items-center gap-2 px-4 py-3 bg-brand-secondary text-brand-dark rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(41,47,54,1)] border-2 border-brand-dark hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                            <Plus size={20} /> Expense
                        </button>

                        <button onClick={() => setShowCalendar(true)} className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-brand-dark rounded-xl font-bold hover:bg-gray-100 transition-colors">
                            📅 Calendar
                        </button>

                        <div
                            onClick={() => window.location.href = "/profile"}
                            className="flex items-center gap-2 bg-white px-4 py-2 border-2 border-brand-dark rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-brand-yellow border-2 border-brand-dark overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} className="w-full h-full" />
                            </div>
                            <div>
                                <span className="font-bold block text-sm">{user?.full_name || 'User'}</span>
                                <span className="text-xs font-black text-brand-primary block">{myPoints} pts</span>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-3 border-2 border-brand-dark rounded-xl font-bold hover:bg-red-100 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Achievements Modal */}
            <AnimatePresence>
                {showAchievements && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card-cartoon bg-white max-w-2xl w-full relative max-h-[80vh] overflow-y-auto">
                            <button onClick={() => setShowAchievements(false)} className="absolute top-2 right-2"><XCircle /></button>
                            <h2 className="text-2xl font-black mb-4 flex items-center gap-2">🏆 Achievements</h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {achievements.map(ach => (
                                    <div key={ach.id} className={`p-4 rounded-xl border-2 ${ach.earned_at ? 'border-brand-primary bg-brand-yellow/20' : 'border-gray-300 bg-gray-100 opacity-50'}`}>
                                        <div className="text-4xl mb-2 text-center">{ach.icon}</div>
                                        <h3 className="font-black text-center text-sm">{ach.name}</h3>
                                        <p className="text-xs text-center text-gray-600 mt-1">{ach.description}</p>
                                        {ach.earned_at && (
                                            <div className="mt-2 text-center">
                                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-bold">✓ Unlocked</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setShowBalances(false)} className="w-full py-3 bg-brand-dark text-white rounded-xl font-bold">Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Calendar Modal */}
            <AnimatePresence>
                {showCalendar && (
                    <CalendarView tasks={tasks} expenses={expenses} onClose={() => setShowCalendar(false)} />
                )}
            </AnimatePresence>

            {/* Pending Approvals Section */}
            {pendingApprovals.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-cartoon mb-8 bg-orange-50 border-orange-300">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">📸 Pending Approvals ({pendingApprovals.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingApprovals.map(task => (
                            <div key={task.id} className="bg-white p-4 rounded-xl border-2 border-brand-dark">
                                <h4 className="font-bold mb-2">{task.title}</h4>
                                {task.proof_photo_url && (
                                    <img src={task.proof_photo_url} alt="Proof" className="w-full h-48 object-cover rounded-lg mb-3 border-2 border-gray-200" />
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApproveTask(task.id, true)}
                                        className="flex-1 py-2 bg-green-500 text-white font-bold rounded-lg border-2 border-brand-dark hover:bg-green-600 transition"
                                    >
                                        ✅ Approve (+{task.points}pts)
                                    </button>
                                    <button
                                        onClick={() => handleApproveTask(task.id, false)}
                                        className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg border-2 border-brand-dark hover:bg-red-600 transition"
                                    >
                                        ❌ Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Smart Split Balances Modal */}
            <AnimatePresence>
                {showBalances && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card-cartoon bg-white max-w-md w-full relative">
                            <button onClick={() => setShowBalances(false)} className="absolute top-2 right-2"><XCircle /></button>
                            <h2 className="text-2xl font-black mb-4 flex items-center gap-2">⚖️ Smart Split</h2>

                            <div className="bg-gray-50 p-4 rounded-xl mb-4 border-2 border-brand-dark/10">
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-500">Total Spent</span>
                                    <span className="font-bold text-xl">${balances.total}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Each Share</span>
                                    <span className="font-bold text-xl text-brand-primary">${balances.share_per_person}</span>
                                </div>
                            </div>

                            <h3 className="font-bold mb-2 uppercase text-xs tracking-widest text-gray-400">Transfers Needed</h3>
                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                                {balances.transfers.length === 0 ? (
                                    <p className="text-center text-green-500 font-bold py-4">We are all square! ✅</p>
                                ) : (
                                    balances.transfers.map((t, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                            <span className="font-bold">{t.from}</span>
                                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                                                gives <span className="text-black font-black">${t.amount}</span> to
                                            </div>
                                            <span className="font-bold">{t.to}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button onClick={handleSettle} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl border-2 border-brand-dark hover:bg-green-600 transition">
                                Settle Up & Clear All 🤝
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Expense Form Modal */}
            {showExpenseForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-cartoon mb-8 bg-brand-secondary/10 border-brand-secondary">
                    <h3 className="text-xl font-bold mb-4">Add New Expense 💰</h3>
                    <div className="flex flex-wrap gap-4">
                        <input
                            placeholder="Description (e.g. Pizza)"
                            className="flex-1 p-3 rounded-xl border-2 border-brand-dark"
                            value={newExpense.description}
                            onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                        />
                        <input
                            placeholder="Amount ($)"
                            type="number"
                            className="w-32 p-3 rounded-xl border-2 border-brand-dark"
                            value={newExpense.amount}
                            onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newExpense.is_subscription}
                                onChange={e => setNewExpense({ ...newExpense, is_subscription: e.target.checked })}
                                className="w-5 h-5 accent-brand-primary"
                            />
                            <span className="font-bold text-sm">Subscription?</span>
                        </div>
                        {newExpense.is_subscription && (
                            <input
                                placeholder="Due Day (1-31)"
                                type="number"
                                className="w-32 p-3 rounded-xl border-2 border-brand-dark"
                                value={newExpense.billing_day}
                                onChange={e => setNewExpense({ ...newExpense, billing_day: e.target.value })}
                            />
                        )}
                        <select
                            className="p-3 rounded-xl border-2 border-brand-dark"
                            value={newExpense.category}
                            onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                        >
                            <option>Grocery</option>
                            <option>Rent</option>
                            <option>Food</option>
                            <option>Utility</option>
                            <option>Entertainment</option>
                            <option>Other</option>
                        </select>
                        <button onClick={handleCreateExpense} className="btn-primary bg-green-500 border-brand-dark">Save</button>
                        <button onClick={() => setShowExpenseForm(false)} className="px-4 font-bold">Cancel</button>
                    </div>
                </motion.div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Column: Tasks & Rewards */}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-cartoon">{viewMode === 'tasks' ? 'Tasks 📝' : 'Rewards Store 🎁'}</h2>
                        <div className="flex bg-white rounded-xl border-2 border-brand-dark p-1">
                            <button
                                onClick={() => setViewMode('tasks')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'tasks' ? 'bg-brand-primary text-white' : 'hover:bg-gray-100'}`}
                            >
                                Tasks
                            </button>
                            <button
                                onClick={() => setViewMode('rewards')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'rewards' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
                            >
                                Rewards
                            </button>
                            <button
                                onClick={() => setViewMode('pantry')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'pantry' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'}`}
                            >
                                Pantry
                            </button>
                        </div>
                    </div>

                    {viewMode === 'tasks' ? (
                        <>
                            {/* Smart AI Input */}
                            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg border-2 border-brand-dark text-white">
                                <label className="font-bold text-sm uppercase tracking-wider mb-2 block opacity-80">✨ Ask Home AI</label>
                                <input
                                    className="w-full p-3 rounded-xl border-none text-brand-dark font-sans shadow-inner placeholder-gray-400"
                                    placeholder='Type "Buy milk $5" or "Remind me to clean tomorrow"...'
                                    value={smartInput}
                                    onChange={(e) => setSmartInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSmartCommand(smartInput);
                                            setSmartInput("");
                                        }
                                    }}
                                />
                            </div>

                            <div className="card-cartoon mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div className="flex-1 w-full">
                                    <input
                                        className="w-full p-3 border-2 border-brand-dark rounded-xl font-sans"
                                        placeholder="What needs to be done? (e.g. Buy Milk)"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && createTask()}
                                    />
                                </div>

                                <select
                                    className="p-3 border-2 border-brand-dark rounded-xl font-sans bg-white"
                                    value={newTaskRecurrence}
                                    onChange={(e) => setNewTaskRecurrence(e.target.value)}
                                >
                                    <option value="">One-time</option>
                                    <option value="daily">Daily 🔄</option>
                                    <option value="weekly">Weekly 📅</option>
                                    <option value="monthly">Monthly 🗓️</option>
                                </select>

                                <button onClick={createTask} className="btn-primary py-3 px-4 text-sm w-full md:w-auto">Add (+10pts)</button>
                            </div>

                            <div className="space-y-6">
                                {['pending', 'in_progress', 'completed'].map((status) => (
                                    <div key={status} className="bg-white/50 p-4 rounded-3xl border-2 border-dashed border-brand-dark/30 min-h-[300px]">
                                        <h3 className="text-xl capitalize text-brand-dark mb-4 text-center font-black opacity-60 flex items-center justify-center gap-2">
                                            {status === 'pending' && '⏳'}
                                            {status === 'in_progress' && '🚧'}
                                            {status === 'completed' && '🏆'}
                                            {status.replace('_', ' ')}
                                        </h3>
                                        <div className="space-y-4">
                                            {tasks.filter(t => t.status === status).map((task) => (
                                                <motion.div
                                                    layoutId={task.id}
                                                    key={task.id}
                                                    className={`card-cartoon p-4 border-2 ${task.priority === 'high' ? 'border-red-400 bg-red-50' :
                                                        task.priority === 'medium' ? 'border-brand-dark' : 'border-green-400'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-lg">{task.title}</h4>
                                                        {task.recurrence && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded border border-blue-200 uppercase font-bold">{task.recurrence}</span>}
                                                    </div>

                                                    <div className="flex justify-between items-center mt-3">
                                                        <span className="text-sm font-bold bg-brand-yellow px-2 py-1 rounded-md border border-brand-dark">+{task.points} pts</span>
                                                        <div className="flex gap-2">
                                                            {status !== 'completed' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleCompleteWithProof(task.id)}
                                                                        className="w-8 h-8 flex items-center justify-center bg-blue-400 rounded-full border-2 border-brand-dark hover:scale-110 transition-transform"
                                                                        title="Complete with Photo Proof"
                                                                    >
                                                                        📸
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateStatus(task.id, 'completed')}
                                                                        className="w-8 h-8 flex items-center justify-center bg-green-400 rounded-full border-2 border-brand-dark hover:scale-110 transition-transform"
                                                                        title="Complete"
                                                                    >
                                                                        <CheckCircle size={16} color="white" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={() => deleteTask(task.id)}
                                                                className="w-8 h-8 flex items-center justify-center bg-red-400 rounded-full border-2 border-brand-dark hover:scale-110 transition-transform text-white"
                                                                title="Delete Task"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : viewMode === 'rewards' ? (
                        <div className="space-y-4">
                            {/* Check Approvals */}
                            {pendingRedemptions.length > 0 && (
                                <div className="mb-8 p-4 bg-brand-yellow/20 rounded-2xl border-2 border-brand-yellow">
                                    <h3 className="text-xl font-black mb-4 flex items-center gap-2">🔔 Pending Approvals</h3>
                                    <div className="space-y-3">
                                        {pendingRedemptions.map(p => (
                                            <div key={p.id} className="card-cartoon p-3 bg-white border-2 border-brand-dark flex flex-col md:flex-row justify-between items-center gap-2">
                                                <div className="text-sm">
                                                    <span className="font-black bg-gray-200 px-2 py-1 rounded mr-2">{p.user_name}</span>
                                                    wants
                                                    <span className="font-black text-purple-600 ml-2">{p.reward_title}</span>
                                                    <span className="text-xs font-bold text-gray-500 ml-1">({p.reward_cost} pts)</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApproval(p.id, 'approved')} className="bg-green-500 text-white font-bold px-3 py-1 rounded-lg border-2 border-brand-dark hover:scale-105 active:scale-95 transition">Approve ✅</button>
                                                    <button onClick={() => handleApproval(p.id, 'rejected')} className="bg-red-500 text-white font-bold px-3 py-1 rounded-lg border-2 border-brand-dark hover:scale-105 active:scale-95 transition">Reject ❌</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Create Reward */}
                            <div className="card-cartoon mb-8 flex gap-4 bg-purple-50 border-purple-200">
                                <input
                                    className="flex-1 p-3 border-2 border-brand-dark rounded-xl font-sans"
                                    placeholder="New Reward Title (e.g. Movie Night 🍿)"
                                    value={newReward.title}
                                    onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                                />
                                <input
                                    type="number"
                                    className="w-32 p-3 border-2 border-brand-dark rounded-xl font-sans"
                                    placeholder="Cost"
                                    value={newReward.cost}
                                    onChange={(e) => setNewReward({ ...newReward, cost: parseInt(e.target.value) })}
                                />
                                <button onClick={createReward} className="btn-primary py-2 px-4 text-sm bg-purple-500">Create</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {rewards.map(reward => (
                                    <div key={reward.id} className="card-cartoon p-6 border-2 border-brand-dark flex flex-col justify-between items-center bg-white hover:rotate-1 transition-transform">
                                        <div className="text-center mb-4">
                                            <div className="text-4xl mb-2">🎁</div>
                                            <h3 className="font-black text-xl">{reward.title}</h3>
                                            <p className="text-gray-500">{reward.description || "No description"}</p>
                                        </div>
                                        <div className="w-full">
                                            <button
                                                onClick={() => claimReward(reward.id)}
                                                disabled={myPoints < reward.cost}
                                                className={`w-full py-3 rounded-xl font-black border-2 border-brand-dark transition-all ${myPoints >= reward.cost
                                                    ? 'bg-brand-yellow hover:bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-none'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {myPoints >= reward.cost ? `Claim for ${reward.cost} pts` : `Need ${reward.cost} pts`}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Shopping List Section */}
                            <div className="card-cartoon bg-blue-50 border-blue-200">
                                <h3 className="text-xl font-black mb-4 flex items-center gap-2">🛒 Shopping List</h3>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        className="flex-1 p-2 rounded-lg border-2 border-brand-dark"
                                        placeholder="Add item..."
                                        value={newItemName}
                                        onChange={e => setNewItemName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addToShopping()}
                                    />
                                    <button onClick={addToShopping} className="bg-blue-500 text-white font-bold px-4 rounded-lg">Add</button>
                                </div>
                                <div className="space-y-2">
                                    {shoppingList.map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-100">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={item.is_checked}
                                                    onChange={() => toggleShopping(item.id)}
                                                    className="w-5 h-5 accent-blue-500"
                                                />
                                                <span className={item.is_checked ? 'line-through text-gray-400' : 'font-bold'}>{item.name}</span>
                                            </div>
                                            <button onClick={() => moveToPantry(item.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold hover:bg-green-200">
                                                Move to Pantry ➡️
                                            </button>
                                        </div>
                                    ))}
                                    {shoppingList.length === 0 && <p className="text-center opacity-50 text-sm">List is empty</p>}
                                </div>
                            </div>

                            {/* Pantry Inventory */}
                            <div className="card-cartoon bg-green-50 border-green-200">
                                <h3 className="text-xl font-black mb-4 flex items-center gap-2">🥑 Pantry Inventory</h3>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        className="flex-1 p-2 rounded-lg border-2 border-brand-dark"
                                        placeholder="Add item..."
                                        value={newItemName}
                                        onChange={e => setNewItemName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addToPantry()}
                                    />
                                    <button onClick={addToPantry} className="bg-green-500 text-white font-bold px-4 rounded-lg">Add</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {pantryItems.map(item => (
                                        <div key={item.id} className="bg-white p-3 rounded-lg border border-green-100 flex justify-between">
                                            <span className="font-bold">{item.name}</span>
                                            <span className="text-gray-500">x{item.quantity}</span>
                                        </div>
                                    ))}
                                    {pantryItems.length === 0 && <p className="col-span-2 text-center opacity-50 text-sm">Pantry is empty</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Expenses & Leaderboard */}
                <div className="w-full md:w-1/3 flex flex-col gap-8">
                    {/* Leaderboard Widget */}
                    <div>
                        <h2 className="text-2xl font-cartoon mb-4">🏆 Leaderboard</h2>
                        <div className="card-cartoon bg-white p-4 border-2 border-brand-dark">
                            {leaderboard.map((member, idx) => (
                                <div key={member.user_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-black w-6 text-center ${idx === 0 ? 'text-2xl' : ''}`}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</span>
                                        <img src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center bg-gray-100" />
                                        <span className="font-bold text-sm truncate max-w-[100px]">{member.full_name}</span>
                                    </div>
                                    <span className="font-black text-brand-primary">{member.points} pts</span>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-center opacity-50">No data</p>}
                        </div>
                    </div>

                    {/* Expenses Widget */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-cartoon">Expenses 💸</h2>
                            <button onClick={fetchBalances} className="text-sm font-bold bg-white px-3 py-1 rounded-lg border-2 border-brand-dark hover:bg-gray-100 flex items-center gap-1">
                                <DollarSign size={14} /> Balances
                            </button>
                        </div>

                        <div className="space-y-4">
                            <FinanceAnalytics expenses={expenses} />

                            {/* Upcoming Subscriptions */}
                            {expenses.some(e => e.is_subscription) && (
                                <div className="card-cartoon bg-purple-50 border-purple-200">
                                    <h3 className="font-black text-purple-800 mb-2 flex items-center gap-2">📅 Monthly Bills</h3>
                                    {expenses.filter(e => e.is_subscription).map(sub => (
                                        <div key={sub.id} className="flex justify-between items-center py-2 border-b border-purple-100 last:border-0">
                                            <div>
                                                <p className="font-bold">{sub.description}</p>
                                                <span className="text-xs text-purple-600">Due day: {sub.billing_day || 'N/A'}</span>
                                            </div>
                                            <span className="font-black">${sub.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {expenses.filter(e => !e.is_subscription).map(expense => (
                                <div key={expense.id} className="card-cartoon p-4 border-2 border-brand-dark flex justify-between items-center bg-white">
                                    <div>
                                        <p className="font-bold text-lg">{expense.description}</p>
                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{expense.category}</span>
                                    </div>
                                    <div className="text-xl font-black text-green-600">
                                        ${expense.amount}
                                    </div>
                                </div>
                            ))}
                            {expenses.length === 0 && <p className="opacity-50 text-center">No expenses yet.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Chat - Always Visible */}
            {group && <Chat groupId={group.id} onClose={() => { }} />}

            {/* Mobile Navigation */}
            <MobileNav
                currentTab={viewMode}
                setTab={(tab) => {
                    if (tab === 'dashboard') window.scrollTo({ top: 0, behavior: 'smooth' });
                    else if (tab === 'profile') window.location.href = "/profile";
                    else if (tab === 'tasks') setViewMode('tasks');
                    else if (tab === 'finance') {
                        // Scroll to finance section roughly
                        window.scrollTo({ top: 1200, behavior: 'smooth' });
                    }
                }}
            />
            <div className="h-20 md:hidden"></div>
        </div>
    );
}
