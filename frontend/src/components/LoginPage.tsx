import { useState } from 'react';
import { DEMO_USERS } from '../mockData';
import type { User } from '../types';

interface LoginPageProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
}

export function LoginPage({ currentUser, onLogin, onLogout }: LoginPageProps) {
  const [name, setName] = useState(currentUser?.name ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name or nickname.');
      return;
    }

    const existingDemo = DEMO_USERS.find(
      (u) => u.name.toLowerCase() === trimmedName.toLowerCase()
    );

    const loggedUser: User = existingDemo ?? {
      id: `u-${trimmedName.toLowerCase().replace(/\s+/g, '-')}`,
      name: trimmedName,
      email: email.trim() || null,
    };

    setError('');
    onLogin(loggedUser);
  };

  return (
    <div className="w-full max-w-3xl mx-auto pt-4 space-y-8">
      <div className="border-b border-white/15 pb-5">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Sign In
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-2">
              Name or Nickname
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Nowak"
              className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-white bg-[#181a20] border border-white/30 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 px-5 bg-white hover:bg-white/90 text-black text-base font-semibold rounded-md transition-transform active:scale-95 cursor-pointer"
        >
          Continue
        </button>
      </form>

      <div className="pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DEMO_USERS.map((u) => {
          const isSelected = currentUser?.id === u.id;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => onLogin(u)}
              className={`text-left px-4 py-3 rounded-md border text-base transition-colors active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-white border-white text-black font-semibold'
                  : 'bg-[#181a20] border-white/15 hover:bg-white/10 hover:border-white/40 text-white'
              }`}
            >
              {u.name}
            </button>
          );
        })}
      </div>

      {currentUser && (
        <div className="pt-5 border-t border-white/15 flex items-center justify-between text-base text-white">
          <span className="font-semibold">{currentUser.name}</span>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md transition-transform active:scale-95 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
