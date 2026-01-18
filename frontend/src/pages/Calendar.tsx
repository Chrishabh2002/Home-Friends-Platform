import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'sonner';

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    points: number;
    due_date?: string;
    recurrence?: string;
}

export default function Calendar() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/tasks/');
            setTasks(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const getTasksForDate = (date: Date) => {
        return tasks.filter(task => {
            if (!task.due_date) return false;
            const taskDate = new Date(task.due_date);
            return taskDate.toDateString() === date.toDateString();
        });
    };

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(clickedDate);
        setSelectedTasks(getTasksForDate(clickedDate));
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleCompleteTask = async (taskId: string) => {
        try {
            await axios.put(`http://localhost:8000/api/v1/tasks/${taskId}?status=completed`);
            toast.success('Task completed!');
            fetchTasks();
            if (selectedDate) {
                setSelectedTasks(getTasksForDate(selectedDate));
            }
        } catch (e) {
            toast.error('Failed to complete task');
        }
    };

    return (
        <div className="min-h-screen bg-brand-light p-4 md:p-8">
            <Toaster position="top-center" />

            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex items-center gap-2 mb-8 text-brand-dark font-bold hover:underline"
                >
                    <ArrowLeft /> Back to Dashboard
                </button>

                <div className="card-cartoon bg-white border-brand-dark mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-black">📅 Task Calendar</h1>
                        <div className="flex items-center gap-4">
                            <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-full">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-bold min-w-[200px] text-center">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </h2>
                            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full">
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {/* Day Headers */}
                        {dayNames.map(day => (
                            <div key={day} className="text-center font-bold text-gray-600 py-2">
                                {day}
                            </div>
                        ))}

                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {/* Calendar days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const tasksForDay = getTasksForDate(date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isSelected = selectedDate?.toDateString() === date.toDateString();

                            return (
                                <motion.div
                                    key={day}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => handleDateClick(day)}
                                    className={`aspect-square p-2 rounded-xl border-2 cursor-pointer transition-all ${isToday ? 'border-brand-primary bg-brand-yellow/20' :
                                        isSelected ? 'border-brand-secondary bg-brand-secondary/20' :
                                            'border-gray-200 hover:border-brand-dark'
                                        }`}
                                >
                                    <div className="font-bold text-sm">{day}</div>
                                    {tasksForDay.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                            {tasksForDay.slice(0, 2).map(task => (
                                                <div
                                                    key={task.id}
                                                    className={`text-xs px-1 rounded truncate ${task.priority === 'high' ? 'bg-red-200' :
                                                        task.priority === 'medium' ? 'bg-yellow-200' :
                                                            'bg-green-200'
                                                        }`}
                                                >
                                                    {task.title}
                                                </div>
                                            ))}
                                            {tasksForDay.length > 2 && (
                                                <div className="text-xs text-gray-500">+{tasksForDay.length - 2} more</div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Tasks */}
                {selectedDate && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-cartoon bg-white border-brand-dark"
                    >
                        <h3 className="text-xl font-black mb-4">
                            Tasks for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        {selectedTasks.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No tasks scheduled for this day</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`p-4 rounded-xl border-2 ${task.priority === 'high' ? 'border-red-400 bg-red-50' :
                                            task.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                                                'border-green-400 bg-green-50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold">{task.title}</h4>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="text-xs bg-white px-2 py-1 rounded border">
                                                        {task.status}
                                                    </span>
                                                    <span className="text-xs bg-brand-yellow px-2 py-1 rounded border border-brand-dark">
                                                        +{task.points} pts
                                                    </span>
                                                    {task.recurrence && (
                                                        <span className="text-xs bg-blue-100 px-2 py-1 rounded border border-blue-200">
                                                            {task.recurrence}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {task.status !== 'completed' && (
                                                <button
                                                    onClick={() => handleCompleteTask(task.id)}
                                                    className="px-3 py-1 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition"
                                                >
                                                    ✓ Complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
