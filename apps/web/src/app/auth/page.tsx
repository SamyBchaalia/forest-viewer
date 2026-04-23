'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Leaf, MapPin, BarChart3 } from 'lucide-react';
import Image from 'next/image';

const FEATURES = [
    { icon: MapPin,     label: 'BD Forêt V2 data' },
    { icon: Leaf,       label: 'Real-time analysis' },
    { icon: BarChart3,  label: 'Spatial queries' },
];

export default function AuthPage() {
    const [mounted, setMounted] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && !isLoading && isAuthenticated) router.push('/');
    }, [mounted, isAuthenticated, isLoading, router]);

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b4a59]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <p className="text-white/60 text-sm">Loading…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* ── Left: Branding ── */}
            <div
                className="relative lg:w-[45%] flex flex-col justify-between p-10 lg:p-16 text-white overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0b4a59 0%, #083845 60%, #052d38 100%)' }}
            >
                {/* Decorative rings */}
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-white/5" />
                <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full border border-white/5" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full border border-white/5 translate-x-1/3 translate-y-1/3" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm ring-1 ring-white/10">
                            <Image
                                src="/reseau_symbiose_logo.jfif"
                                alt="Réseau Symbiose"
                                width={40}
                                height={40}
                                className="rounded-lg"
                                priority
                            />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-white/50 uppercase tracking-widest">Réseau Symbiose</p>
                            <h1 className="text-xl font-bold leading-tight">Forest BD</h1>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 my-auto">
                    <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                        Explore French<br />
                        <span className="text-emerald-300">forest data</span>
                    </h2>
                    <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                        Interactive geospatial visualization of BD Forêt V2 — filter, analyze, and annotate forest plots across France.
                    </p>

                    <div className="mt-10 flex flex-col gap-3">
                        {FEATURES.map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                    <Icon size={15} className="text-emerald-300" />
                                </div>
                                <span className="text-sm text-white/70">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-white/30 text-xs">
                        © {new Date().getFullYear()} Réseau Symbiose · Forest BD Viewer
                    </p>
                </div>
            </div>

            {/* ── Right: Form ── */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md animate-fade-up">
                    {isLogin
                        ? <LoginForm onToggle={() => setIsLogin(false)} />
                        : <RegisterForm onToggle={() => setIsLogin(true)} />
                    }
                </div>
            </div>
        </div>
    );
}
