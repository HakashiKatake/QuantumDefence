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
    <div className="flex h-screen w-screen items-center justify-center bg-bg-main bg-[radial-gradient(circle,_#101c33_10%,_#0a1628_90%)] select-none">
      <div className="w-[400px] bg-bg-card border border-border-cyan-hover rounded shadow-[0_0_20px_rgba(0,212,255,0.15)] p-9 box-border">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-cyan/10 border border-accent-cyan mb-4">
            <ShieldAlert className="text-accent-cyan w-7 h-7" />
          </div>
          <h2 className="m-0 text-xl font-bold tracking-widest uppercase text-white font-sans">QuantumDefense C2</h2>
          <p className="mt-2 text-[11px] font-mono text-white/40 tracking-widest">MIL-STD COMMS SECURE // NODE LEVEL 4</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-accent-red/8 border border-accent-red/20 text-accent-red p-3 rounded text-[13px] mb-5 font-mono">
            ERROR: {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-[11px] font-semibold text-accent-cyan uppercase tracking-wider mb-1.5 font-sans">Security Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@quantumdefense.mil"
                className="w-full h-10 bg-bg-input border border-border-cyan rounded text-white pl-10 pr-3 box-border outline-none text-[14px] font-mono transition-colors duration-200 focus:border-accent-cyan"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-accent-cyan uppercase tracking-wider mb-1.5 font-sans">Access Cipher</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 bg-bg-input border border-border-cyan rounded text-white pl-10 pr-3 box-border outline-none text-[14px] font-mono transition-colors duration-200 focus:border-accent-cyan"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-11 bg-transparent border border-accent-cyan rounded text-accent-cyan text-[14px] font-bold uppercase tracking-widest cursor-pointer mt-2.5 transition-all duration-200 hover:bg-accent-cyan hover:text-bg-main"
          >
            {submitting ? 'Authenticating...' : 'Establish Session'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
