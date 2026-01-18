import { Home, CheckSquare, DollarSign, User } from 'lucide-react';

interface MobileNavProps {
    currentTab: string;
    setTab: (tab: string) => void;
}

export default function MobileNav({ currentTab, setTab }: MobileNavProps) {
    const navItems = [
        { id: 'dashboard', label: 'Home', icon: <Home size={24} /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={24} /> },
        { id: 'finance', label: 'Finance', icon: <DollarSign size={24} /> },
        { id: 'profile', label: 'Profile', icon: <User size={24} /> },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-brand-dark px-6 py-3 flex justify-between z-50 rounded-t-2xl shadow-[0px_-5px_20px_rgba(0,0,0,0.1)]">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex flex-col items-center gap-1 transition-all ${currentTab === item.id
                            ? 'text-brand-primary scale-110 font-bold'
                            : 'text-gray-400 font-medium'
                        }`}
                >
                    {item.icon}
                    <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                </button>
            ))}
        </div>
    );
}
