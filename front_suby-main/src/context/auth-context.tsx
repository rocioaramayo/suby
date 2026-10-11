import React, { createContext, useContext, useMemo, useState } from 'react';

export interface AuthSession {
  email: string;
  token: string;
  userId?: number;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  membershipTier?: string;
  declaredGuarantee?: number;
}

export interface RegistrationDraft {
  nombre: string;
  apellido: string;
  email: string;
  pais: string;
  domicilio: string;
  documento: string;
}

export interface PasswordResetSession {
  email: string;
  code?: string;
  token?: string;
  userId?: number;
  pendingSession?: AuthSession;
}

export type PaymentMethodType = 'card' | 'bank' | 'check';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  title: string;
  subtitle: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  registrationDraft: RegistrationDraft | null;
  passwordResetSession: PasswordResetSession | null;
  paymentMethods: PaymentMethod[];
  setSession: (session: AuthSession | null) => void;
  setRegistrationDraft: (draft: RegistrationDraft | null) => void;
  setPasswordResetSession: (session: PasswordResetSession | null) => void;
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  removePaymentMethod: (id: string) => void;
  clearAll: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [registrationDraft, setRegistrationDraft] = useState<RegistrationDraft | null>(null);
  const [passwordResetSession, setPasswordResetSession] = useState<PasswordResetSession | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      registrationDraft,
      passwordResetSession,
      paymentMethods,
      setSession,
      setRegistrationDraft,
      setPasswordResetSession,
      addPaymentMethod: (method) => {
        setPaymentMethods((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            ...method,
          },
        ]);
      },
      removePaymentMethod: (id) => {
        setPaymentMethods((prev) => prev.filter((method) => method.id !== id));
      },
      clearAll: () => {
        setSession(null);
        setRegistrationDraft(null);
        setPasswordResetSession(null);
        setPaymentMethods([]);
      },
    }),
    [passwordResetSession, paymentMethods, registrationDraft, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
