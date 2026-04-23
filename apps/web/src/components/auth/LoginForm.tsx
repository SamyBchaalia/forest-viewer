'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LOGIN_MUTATION } from '@/graphql/auth';
import type { LoginResponse, LoginVariables } from '@/graphql/types';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
    onToggle: () => void;
}

export function LoginForm({ onToggle }: LoginFormProps) {
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const setAuth = useAuthStore((state) => state.setAuth);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const [login, { loading }] = useMutation<LoginResponse, LoginVariables>(LOGIN_MUTATION);

    const onSubmit = async (data: LoginFormData) => {
        try {
            setError('');
            const result = await login({ variables: { input: data } });
            const { token, user } = result.data!.login;
            setAuth(user, token);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        }
    };

    const busy = loading || isSubmitting;

    return (
        <div className="glass-card p-8 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>
            </div>

            {error && (
                <div className="flex items-start gap-2.5 p-3.5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Email address
                    </label>
                    <input
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="input-field"
                    />
                    {errors.email && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle size={11} />
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            {...register('password')}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="input-field pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle size={11} />
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <button type="submit" disabled={busy} className="btn-primary mt-2">
                    {busy && <Loader2 className="animate-spin" size={16} />}
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>

            <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <button
                    onClick={onToggle}
                    className="font-semibold text-[#0b4a59] hover:text-[#083845] transition-colors hover:underline underline-offset-2"
                >
                    Create one
                </button>
            </p>
        </div>
    );
}
