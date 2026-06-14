import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, Key, Mail } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Login failed. Please verify credentials.');
      }

      login(result.data.user, result.data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-950 select-none overflow-hidden">
      {/* Sleek SVG Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.05]" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-sky-500/5 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="relative w-[400px] bg-zinc-900 border border-zinc-800 rounded-xl p-8 box-border shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 mb-4">
            <ShieldAlert className="text-zinc-100 w-6 h-6" />
          </div>
          <h2 className="m-0 text-[18px] font-bold tracking-wider uppercase text-zinc-100 font-sans">QuantumDefense C2</h2>
          <p className="mt-1.5 text-[10px] font-mono text-zinc-500 tracking-wider">MIL-STD COMMS SECURE // NODE LEVEL 4</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-[12px] mb-5 font-mono">
            ERROR: {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Security Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@quantumdefense.mil"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 pl-10 pr-3 box-border outline-none text-[13px] font-mono transition-all duration-150 focus:border-zinc-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Access Cipher</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 pl-10 pr-3 box-border outline-none text-[13px] font-mono transition-all duration-150 focus:border-zinc-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-100 rounded-lg text-[13px] font-bold uppercase tracking-wider cursor-pointer mt-3 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Authenticating...' : 'Establish Session'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
