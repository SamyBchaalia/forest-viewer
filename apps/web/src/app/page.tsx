'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { ForestMap } from '@/components/map/ForestMap';
import { ME_QUERY } from '@/graphql/auth';
import type { MeResponse } from '@/graphql/types';
import { TreePine } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  const { loading: meLoading } = useQuery<MeResponse>(ME_QUERY, {
    skip: !mounted,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated && !meLoading) {
      router.push('/auth');
    }
  }, [mounted, isAuthenticated, isLoading, meLoading, router]);

  if (!mounted || isLoading || meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#052d38]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <TreePine size={22} className="text-emerald-300" />
          </div>
          <div className="flex items-center gap-2.5 text-white/70 text-sm">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            Loading map…
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <ForestMap />;
}
