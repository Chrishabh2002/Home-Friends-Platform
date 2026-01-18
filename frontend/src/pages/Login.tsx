import { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const { register, handleSubmit } = useForm();
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setError('');
        try {
            if (isLogin) {
                const res = await axios.post('http://localhost:8000/api/v1/auth/login', {
                    email: data.email,
                    password: data.password
                });
                login(res.data.access_token);
                navigate('/dashboard'); // Direct to dashboard
            } else {
                // Signup
                await axios.post('http://localhost:8000/api/v1/auth/signup', data);

                // Auto-login after signup
                const loginRes = await axios.post('http://localhost:8000/api/v1/auth/login', {
                    email: data.email,
                    password: data.password
                });
                login(loginRes.data.access_token);
                navigate('/dashboard'); // Direct to dashboard after signup
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "An error occurred");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-yellow/20">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="card-cartoon w-full max-w-md"
            >
                <h2 className="text-3xl font-cartoon mb-6 text-center text-brand-primary">
                    {isLogin ? 'Welcome Back!' : 'Join the Fun!'}
                </h2>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block font-bold mb-1">Full Name</label>
                            <input {...register('full_name')} className="w-full p-3 rounded-xl border-2 border-brand-dark" placeholder="Your Name" />
                        </div>
                    )}

                    <div>
                        <label className="block font-bold mb-1">Email</label>
                        <input {...register('email')} className="w-full p-3 rounded-xl border-2 border-brand-dark" placeholder="hello@example.com" />
                    </div>

                    <div>
                        <label className="block font-bold mb-1">Password</label>
                        <input type="password" {...register('password')} className="w-full p-3 rounded-xl border-2 border-brand-dark" placeholder="********" />
                    </div>

                    <button type="submit" className="btn-primary w-full mt-4">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                <p className="text-center mt-4 cursor-pointer underline" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "New here? Create account" : "Already have an account? Login"}
                </p>
            </motion.div>
        </div>
    );
}
