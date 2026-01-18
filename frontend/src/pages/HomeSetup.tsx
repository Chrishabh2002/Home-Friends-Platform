import { useState } from "react";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { motion } from "framer-motion";

export default function HomeSetup() {
    const { logout } = useAuthStore();
    const [groupName, setGroupName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [mode, setMode] = useState<'create' | 'join'>('create');
    const [error, setError] = useState("");

    const handleCreate = async () => {
        try {
            await axios.post("http://localhost:8000/api/v1/groups/", { name: groupName });
            window.location.href = "/dashboard"; // Redirect to dashboard
        } catch (err: any) {
            setError(err.response?.data?.detail || "Error creating group");
        }
    }

    const handleJoin = async () => {
        try {
            await axios.post("http://localhost:8000/api/v1/groups/join", { invite_code: inviteCode });
            window.location.href = "/dashboard"; // Redirect to dashboard
        } catch (err: any) {
            setError(err.response?.data?.detail || "Invalid invite code");
        }
    }

    return (
        <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="card-cartoon max-w-md w-full text-center"
            >
                <h1 className="text-3xl font-cartoon text-brand-primary mb-2">Welcome Home! 🏡</h1>
                <p className="mb-6 text-gray-600">Join a family group or start a new one.</p>

                {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'create' ? 'bg-white shadow' : ''}`}
                        onClick={() => setMode('create')}
                    >
                        Create New
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'join' ? 'bg-white shadow' : ''}`}
                        onClick={() => setMode('join')}
                    >
                        Join Existing
                    </button>
                </div>

                {mode === 'create' ? (
                    <div className="space-y-4">
                        <input
                            className="w-full p-3 border-2 border-brand-dark rounded-xl"
                            placeholder="Home Name (e.g. The Smiths)"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                        />
                        <button onClick={handleCreate} className="btn-primary w-full">Create Home 🎉</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input
                            className="w-full p-3 border-2 border-brand-dark rounded-xl"
                            placeholder="Enter 6-digit Code"
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value.toUpperCase())}
                            maxLength={6}
                        />
                        <button onClick={handleJoin} className="btn-primary w-full">Join Home 🏠</button>
                    </div>
                )}

                <button onClick={logout} className="mt-6 text-sm underline text-gray-500">Logout</button>
            </motion.div>
        </div>
    )
}
