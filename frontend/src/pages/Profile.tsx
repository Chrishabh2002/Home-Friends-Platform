import { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../config";
import { useAuthStore } from "../store/authStore";
import { Save, ArrowLeft, LogOut, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";

const PRESET_AVATARS = [
    { id: 'avatar1', url: 'https://avataaars.io/?avatarStyle=Circle&topType=LongHairCurly&accessoriesType=Wayfarers&hairColor=Brown&facialHairType=BeardMajestic&facialHairColor=BrownDark&clotheType=Overall&clotheColor=Red&eyeType=Happy&eyebrowType=Angry&mouthType=Tongue&skinColor=Tanned', label: 'Bearded Guy' },
    { id: 'avatar2', url: 'https://avataaars.io/?avatarStyle=Circle&topType=WinterHat3&accessoriesType=Prescription01&hatColor=PastelBlue&facialHairType=MoustacheMagnum&facialHairColor=Brown&clotheType=ShirtCrewNeck&clotheColor=PastelGreen&eyeType=Side&eyebrowType=AngryNatural&mouthType=Twinkle&skinColor=DarkBrown', label: 'Winter Hat' },
    { id: 'avatar3', url: 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads01&accessoriesType=Round&hairColor=Blonde&facialHairType=MoustacheFancy&facialHairColor=Brown&clotheType=BlazerShirt&clotheColor=PastelOrange&eyeType=Happy&eyebrowType=SadConcerned&mouthType=Serious&skinColor=Brown', label: 'Dreads' },
    { id: 'avatar4', url: 'https://avataaars.io/?avatarStyle=Circle&topType=WinterHat4&accessoriesType=Prescription02&hatColor=PastelRed&hairColor=SilverGray&facialHairType=MoustacheFancy&facialHairColor=Auburn&clotheType=BlazerSweater&clotheColor=PastelYellow&eyeType=Hearts&eyebrowType=RaisedExcitedNatural&mouthType=Smile&skinColor=Pale', label: 'Hearts' },
    { id: 'avatar5', url: 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&accessoriesType=Prescription01&hatColor=PastelRed&hairColor=BlondeGolden&facialHairType=Blank&facialHairColor=Red&clotheType=ShirtScoopNeck&clotheColor=Black&eyeType=Wink&eyebrowType=FlatNatural&mouthType=Sad&skinColor=Tanned', label: 'Wink' },
    { id: 'avatar6', url: 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortCurly&accessoriesType=Prescription02&hairColor=Platinum&facialHairType=BeardLight&facialHairColor=Platinum&clotheType=ShirtVNeck&clotheColor=Blue03&eyeType=Side&eyebrowType=AngryNatural&mouthType=Smile&skinColor=Pale', label: 'Platinum' },
    { id: 'avatar7', url: 'https://avataaars.io/?avatarStyle=Circle&topType=LongHairBigHair&accessoriesType=Blank&hairColor=Auburn&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=DefaultNatural&mouthType=Smile&skinColor=Pale', label: 'Girl' },
];

export default function Profile() {
    const { logout } = useAuthStore();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({ points: 0, tasksCompleted: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState("");
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(API_URL + "/api/v1/auth/me");
            setUser(res.data);
            setFullName(res.data.full_name);
            setSelectedAvatar(res.data.avatar_url || PRESET_AVATARS[0].url);

            // Fetch points
            try {
                const groupRes = await axios.get(API_URL + "/api/v1/groups/my");
                if (groupRes.data.length > 0) {
                    const groupId = groupRes.data[0].id;
                    const membersRes = await axios.get(`${API_URL}/api/v1/groups/${groupId}/members`);
                    const me = membersRes.data.find((m: any) => m.user_id === res.data.id);
                    if (me) {
                        setStats(s => ({ ...s, points: me.points }));
                    }

                    // Fetch completed tasks count
                    const tasksRes = await axios.get(API_URL + "/api/v1/tasks/");
                    const completedCount = tasksRes.data.filter((t: any) => t.status === 'completed' && t.assigned_to_id === res.data.id).length;
                    setStats(s => ({ ...s, tasksCompleted: completedCount }));
                }
            } catch (e) { }

        } catch (err) {
            console.error(err);
        }
    }

    const handleSaveProfile = async () => {
        try {
            // Update name (backend needs PUT /auth/me endpoint)
            await axios.put(API_URL + "/api/v1/auth/me", {
                full_name: fullName
            });

            toast.success("Profile updated!");
            setIsEditing(false);
            fetchProfile();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Update failed");
        }
    }

    const handleAvatarSelect = async (avatarUrl: string) => {
        try {
            await axios.put(API_URL + "/api/v1/auth/me", {
                avatar_url: avatarUrl
            });
            setSelectedAvatar(avatarUrl);
            setShowAvatarPicker(false);
            toast.success("Avatar updated!");
            fetchProfile();
        } catch (e: any) {
            toast.error("Failed to update avatar");
        }
    }

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you SURE you want to delete your account? This cannot be undone!")) return;
        try {
            await axios.delete(API_URL + "/api/v1/auth/me");
            toast.success("Account deleted");
            logout();
        } catch (e: any) {
            toast.error("Failed to delete account");
        }
    }

    if (!user) return <div className="p-8 text-center font-cartoon text-2xl">Loading Profile... 🧬</div>;

    return (
        <div className="min-h-screen bg-brand-light p-4 md:p-8">
            <Toaster position="top-center" />
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => window.location.href = "/dashboard"}
                    className="flex items-center gap-2 mb-8 text-brand-dark font-bold hover:underline"
                >
                    <ArrowLeft /> Back to Dashboard
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Basic Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="col-span-1 card-cartoon bg-white border-brand-dark text-center"
                    >
                        <div className="relative inline-block">
                            <img
                                src={selectedAvatar}
                                alt="Avatar"
                                className="w-48 h-48 rounded-full border-4 border-brand-primary mx-auto mb-4 bg-gray-100 cursor-pointer hover:opacity-80 transition"
                                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                            />
                            <button
                                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                className="absolute bottom-2 right-4 bg-white rounded-full p-2 border-2 border-brand-dark hover:bg-brand-yellow transition"
                            >
                                ✏️
                            </button>
                        </div>

                        {/* Avatar Picker Modal */}
                        <AnimatePresence>
                            {showAvatarPicker && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="mt-4 p-4 bg-gray-50 rounded-xl border-2 border-brand-dark"
                                >
                                    <h4 className="font-bold mb-3">Choose Avatar</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {PRESET_AVATARS.map(avatar => (
                                            <div
                                                key={avatar.id}
                                                onClick={() => handleAvatarSelect(avatar.url)}
                                                className={`cursor-pointer p-2 rounded-lg border-2 hover:border-brand-primary transition ${selectedAvatar === avatar.url ? 'border-brand-primary bg-brand-yellow/20' : 'border-gray-200'
                                                    }`}
                                            >
                                                <img src={avatar.url} className="w-full rounded-full" />
                                                <p className="text-xs mt-1 font-bold">{avatar.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {isEditing ? (
                            <input
                                className="w-full text-center text-xl font-bold p-2 border-2 border-brand-primary rounded-xl mb-2"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                            />
                        ) : (
                            <h2 className="text-2xl font-black mb-1">{user.full_name}</h2>
                        )}
                        <p className="text-gray-500 font-mono text-sm">{user.email}</p>

                        <div className="mt-8 space-y-2">
                            {isEditing ? (
                                <button onClick={handleSaveProfile} className="w-full btn-cartoon bg-green-400 text-white flex justify-center items-center gap-2">
                                    <Save size={18} /> Save Changes
                                </button>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="w-full btn-cartoon bg-brand-yellow text-brand-dark">
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* Right Column: Stats & Settings */}
                    <div className="col-span-2 space-y-6">

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="card-cartoon bg-brand-primary/10 border-brand-primary flex flex-col items-center justify-center p-6"
                            >
                                <span className="text-5xl mb-2">🪙</span>
                                <h3 className="text-3xl font-black text-brand-primary">{stats.points}</h3>
                                <div className="font-bold text-brand-dark/60 uppercase text-xs tracking-widest">Total Points</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="card-cartoon bg-purple-100 border-purple-500 flex flex-col items-center justify-center p-6"
                            >
                                <span className="text-5xl mb-2">✅</span>
                                <h3 className="text-3xl font-black text-purple-600">{stats.tasksCompleted}</h3>
                                <div className="font-bold text-brand-dark/60 uppercase text-xs tracking-widest">Tasks Done</div>
                            </motion.div>
                        </div>

                        {/* Settings Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="card-cartoon bg-white border-brand-dark"
                        >
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                ⚙️ Account Settings
                            </h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                                    <div>
                                        <h4 className="font-bold">Notifications</h4>
                                        <p className="text-sm text-gray-500">Receive alerts for new tasks</p>
                                    </div>
                                    <input type="checkbox" className="w-6 h-6 accent-brand-primary" defaultChecked />
                                </div>

                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                                    <div>
                                        <h4 className="font-bold">Sound Effects</h4>
                                        <p className="text-sm text-gray-500">Play sounds on completion</p>
                                    </div>
                                    <input type="checkbox" className="w-6 h-6 accent-brand-primary" defaultChecked />
                                </div>

                                <div className="border-t-2 border-gray-100 my-4"></div>

                                <button
                                    onClick={logout}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors border-2 border-red-200"
                                >
                                    <LogOut size={18} /> Logout
                                </button>

                                <button
                                    onClick={handleDeleteAccount}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors text-sm border-2 border-transparent hover:border-red-200"
                                >
                                    <Trash2 size={14} /> Delete Account
                                </button>

                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}
