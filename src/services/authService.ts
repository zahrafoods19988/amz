import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthUser } from '../types';

const LOCAL_AUTH_USERS_KEY = 'cloud_sim_users';
const LOCAL_AUTH_SESSION_KEY = 'cloud_sim_active_session';

class AuthService {
  private activeUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          this.activeUser = {
            id: data.session.user.id,
            email: data.session.user.email || '',
            full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
            created_at: data.session.user.created_at,
          };
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            this.activeUser = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              created_at: session.user.created_at,
            };
          } else {
            this.activeUser = null;
          }
          this.notifyListeners();
        });
      } catch (err) {
        console.warn('Supabase auth init error:', err);
      }
    } else {
      // Local Auth Simulator for preview / before env keys are pasted
      try {
        const savedSession = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
        if (savedSession) {
          this.activeUser = JSON.parse(savedSession);
        }
      } catch (e) {
        console.warn('Local session read error:', e);
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn(this.activeUser));
  }

  public onAuthStateChanged(fn: (user: AuthUser | null) => void): () => void {
    this.listeners.push(fn);
    fn(this.activeUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public getCurrentUser(): AuthUser | null {
    return this.activeUser;
  }

  public async signUp(
    email: string,
    pass: string,
    fullName?: string
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            full_name: fullName || cleanEmail.split('@')[0],
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        this.activeUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: fullName || cleanEmail.split('@')[0],
          created_at: data.user.created_at,
        };
        this.notifyListeners();
        return { user: this.activeUser, error: null };
      }
      return { user: null, error: 'Registration verification required or failed.' };
    }

    // Local Auth Simulator (Fallback / Zero-config)
    try {
      const usersRaw = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
      const users: Array<{ id: string; email: string; pass: string; full_name?: string; created_at?: string }> = usersRaw
        ? JSON.parse(usersRaw)
        : [];

      if (users.some(u => u.email === cleanEmail)) {
        return { user: null, error: 'An account with this email already exists. Please log in.' };
      }

      const newUser: AuthUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        email: cleanEmail,
        full_name: fullName || cleanEmail.split('@')[0],
        created_at: new Date().toISOString(),
      };

      users.push({
        ...newUser,
        pass,
      });

      localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
      localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(newUser));
      this.activeUser = newUser;
      this.notifyListeners();
      return { user: newUser, error: null };
    } catch (e: any) {
      return { user: null, error: e?.message || 'Failed to sign up.' };
    }
  }

  public async login(
    email: string,
    pass: string
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        this.activeUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          created_at: data.user.created_at,
        };
        this.notifyListeners();
        return { user: this.activeUser, error: null };
      }
      return { user: null, error: 'Login failed. Please check credentials.' };
    }

    // Local Auth Simulator (Fallback)
    try {
      const usersRaw = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
      const users: Array<{ id: string; email: string; pass: string; full_name?: string; created_at?: string }> = usersRaw
        ? JSON.parse(usersRaw)
        : [];

      const found = users.find(u => u.email === cleanEmail && u.pass === pass);
      if (!found) {
        // Auto-provision demo account if empty for seamless evaluation
        if (cleanEmail === 'zahrafoods1998@gmail.com' && pass.length >= 6) {
          const defaultUser: AuthUser = {
            id: 'usr_zahra_foods_default',
            email: cleanEmail,
            full_name: 'Zahra Foods',
            created_at: new Date().toISOString(),
          };
          users.push({ ...defaultUser, pass });
          localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
          localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(defaultUser));
          this.activeUser = defaultUser;
          this.notifyListeners();
          return { user: defaultUser, error: null };
        }
        return { user: null, error: 'Invalid email or password. Please verify your credentials.' };
      }

      const user: AuthUser = {
        id: found.id,
        email: found.email,
        full_name: found.full_name,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(user));
      this.activeUser = user;
      this.notifyListeners();
      return { user, error: null };
    } catch (e: any) {
      return { user: null, error: e?.message || 'Login error.' };
    }
  }

  public async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase logout error:', e);
      }
    }
    localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
    this.activeUser = null;
    this.notifyListeners();
  }

  public async resetPassword(email: string): Promise<{ error: string | null; message: string | null }> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        return { error: error.message, message: null };
      }
      return { error: null, message: `Password reset instructions sent to ${cleanEmail}.` };
    }

    // Local Simulator
    return {
      error: null,
      message: `Password reset link simulated for ${cleanEmail}. In production, an email with a secure reset link is dispatched.`,
    };
  }
}

export const authService = new AuthService();
