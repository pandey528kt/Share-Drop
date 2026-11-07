import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import AdminDashboard from '@/components/AdminDashboard';
import AdminForgotPassword from '@/components/AdminForgotPassword';
import AdminLogin from '@/components/AdminLogin';
import { isOwnerEmail } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type AdminView = 'login' | 'forgot' | 'recovery';

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<AdminView>('login');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setView('recovery');
      setSession(nextSession);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
      </div>
    );
  }

  const email = session?.user.email ?? null;
  if (session && isOwnerEmail(email)) {
    return <AdminDashboard email={email ?? ''} />;
  }

  const signedInAsOther = session !== null;
  const showRecovery = view === 'recovery' && session !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm animate-scale-in rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold leading-[1.2] text-slate-900">Admin panel</h1>

        <div className="mt-6">
          {signedInAsOther && !showRecovery && (
            <div className="space-y-4">
              <p role="alert" className="text-sm font-medium text-red-700">This account does not have admin access.</p>
              <button
                type="button"
                onClick={() => void supabase.auth.signOut()}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          )}

          {!signedInAsOther && view === 'login' && (
            <AdminLogin onForgotPassword={() => setView('forgot')} />
          )}

          {!signedInAsOther && view === 'forgot' && (
            <AdminForgotPassword initialStep="request" onBack={() => setView('login')} onDone={() => setView('login')} />
          )}

          {showRecovery && (
            <AdminForgotPassword initialStep="set" onBack={() => setView('login')} onDone={() => setView('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
