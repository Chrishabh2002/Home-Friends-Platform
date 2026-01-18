import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

import { XCircle } from 'lucide-react';

interface CalendarViewProps {
    tasks: any[];
    expenses: any[];
    onClose: () => void;
}

export default function CalendarView({ tasks, expenses, onClose }: CalendarViewProps) {
    const [date, setDate] = useState(new Date());
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // Helper to find items on a specific date
    const getItemsForDate = (d: Date) => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayOfMonth = d.getDate();

        const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));
        // Subscriptions match day of month
        const dayBills = expenses.filter(e => e.is_subscription && e.billing_day === dayOfMonth);

        return [...dayTasks, ...dayBills];
    };

    // Update selected items when date changes
    useEffect(() => {
        setSelectedItems(getItemsForDate(date));
    }, [date, tasks, expenses]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 max-w-4xl w-full h-[80vh] flex flex-col md:flex-row gap-6 shadow-[0px_0px_50px_rgba(0,0,0,0.5)] border-4 border-brand-dark overflow-hidden"
            >
                <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 border-2 border-brand-dark hover:bg-gray-100"><XCircle size={32} /></button>

                {/* Calendar Side */}
                <div className="flex-1 flex flex-col">
                    <h2 className="text-3xl font-cartoon mb-6 text-brand-primary">📅 House Calendar</h2>
                    <div className="calendar-cartoon-wrapper flex-1 overflow-y-auto">
                        <Calendar
                            onChange={setDate as any}
                            value={date as any}
                            tileClassName={({ date }) => {
                                const items = getItemsForDate(date);
                                if (items.length > 0) {
                                    const hasBill = items.some((i: any) => i.billing_day !== undefined);
                                    return hasBill ? 'has-bill' : 'has-task';
                                }
                                return null;
                            }}
                        />
                    </div>
                </div>

                {/* Details Side */}
                <div className="w-full md:w-1/3 bg-gray-50 rounded-2xl p-4 border-2 border-brand-dark/20 flex flex-col">
                    <h3 className="text-xl font-bold mb-4 border-b-2 border-gray-200 pb-2">
                        {format(date, 'MMMM do, yyyy')}
                    </h3>

                    <div className="space-y-3 overflow-y-auto flex-1">
                        {selectedItems.length === 0 ? (
                            <p className="text-gray-400 text-center mt-10 italic">Nothing scheduled for today. Relax! 🌴</p>
                        ) : (
                            selectedItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-xl border-2 shadow-sm ${item.billing_day !== undefined
                                        ? 'bg-purple-100 border-purple-300'
                                        : 'bg-white border-brand-dark'
                                        }`}
                                >
                                    {item.billing_day !== undefined ? (
                                        // Bill
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Bill Due</span>
                                                <p className="font-bold">{item.description}</p>
                                            </div>
                                            <span className="font-black text-lg">${item.amount}</span>
                                        </div>
                                    ) : (
                                        // Task
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Task</span>
                                                <p className="font-bold">{item.title}</p>
                                            </div>
                                            <span className="font-bold bg-brand-yellow px-2 py-1 rounded text-xs">+{item.points}pts</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <button onClick={onClose} className="mt-4 w-full py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-black transition-colors">
                        Close
                    </button>
                </div>
            </motion.div>

            <style>{`
                .react-calendar { 
                    width: 100%; 
                    border: none; 
                    font-family: 'Outfit', sans-serif;
                }
                .react-calendar__tile {
                    height: 80px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding-top: 10px;
                    border-radius: 12px;
                    margin-bottom: 4px;
                }
                .react-calendar__tile--now {
                    background: #FFF9C4;
                    color: black;
                }
                .react-calendar__tile--active {
                    background: #2D3436 !important;
                    color: white !important;
                }
                .has-task {
                    position: relative;
                }
                .has-task::after {
                    content: '•';
                    color: #00b894;
                    font-size: 24px;
                    line-height: 10px;
                }
                .has-bill {
                    position: relative;
                }
                .has-bill::after {
                    content: '•';
                    color: #a29bfe;
                    font-size: 24px;
                    line-height: 10px;
                }
            `}</style>
        </motion.div>
    );
}
