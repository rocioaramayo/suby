import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { BrandLogo } from '@/components/brand-logo';
import * as Network from 'expo-network';
import { getApiErrorMessage, isInvalidCredentialsError, isNetworkError, login } from '@/lib/api';
import { PRIMARY_BROWN } from '@/theme/colors';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setSession, setPasswordResetSession } = useAuth();
  const networkState = Network.useNetworkState();
  const hasInternet = networkState.isInternetReachable ?? networkState.isConnected ?? true;

  // Limpiar cualquier sesión de reseteo al entrar al Login
  useEffect(() => {
    setPasswordResetSession(null);
  }, [setPasswordResetSession]);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setErrorMessage(null);

    if (!normalizedEmail || !password) {
      setErrorMessage('Ingresá tu email y tu contraseña.');
      return;
    }

    if (hasInternet === false) {
      router.push('/status/no-internet' as never);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await login(normalizedEmail, password);

      if (!response.token) {
        setErrorMessage('El backend respondió sin token. Revisá la respuesta del endpoint `POST /auth/login`.');
        return;
      }

      const nextSession = {
        email: response.email ?? normalizedEmail,
        token: response.token,
        userId: response.userId,
        displayName: response.displayName,
        firstName: response.firstName,
        lastName: response.lastName,
        membershipTier: response.membershipTier,
        declaredGuarantee: response.declaredGuarantee,
      };

      if (response.requiresPasswordChange) {
        setPasswordResetSession({
          email: nextSession.email,
          token: nextSession.token,
          userId: nextSession.userId,
          pendingSession: nextSession,
        });
        router.replace('/first-login/change-password' as never);
        return;
      }

      setSession(nextSession);
      router.replace('/(tabs)' as never);
    } catch (error) {
      if (isNetworkError(error)) {
        router.push('/status/no-internet' as never);
        return;
      }

      if (isInvalidCredentialsError(error)) {
        setErrorMessage('Email o contraseña incorrectos.');
        return;
      }

      setErrorMessage(getApiErrorMessage(error, 'No pudimos iniciar sesión. Intentá nuevamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.logoWrapper}>
          <BrandLogo size={92} variant="badge" />
        </View>

        <Text style={styles.title}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitle}>Inicia sesión en tu cuenta Suby</Text>

        <Text style={styles.inputLabel}>Email</Text>
        <View style={styles.inputContainer}>
          <Feather name="mail" size={20} color="#A0AEC0" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor="#A0AEC0"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
          />
        </View>

        <Text style={styles.inputLabel}>Contraseña</Text>
        <View style={styles.inputContainer}>
          <Feather name="lock" size={20} color="#A0AEC0" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#A0AEC0"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#A0AEC0" />
          </TouchableOpacity>
        </View>

        {hasInternet === false ? (
          <View style={[styles.helperBanner, styles.helperBannerOffline]}>
            <Feather name="wifi-off" size={16} color="#B45309" />
            <Text style={styles.helperText}>No detectamos internet en este dispositivo.</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#B42318" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity 
          style={styles.forgotPassword} 
          onPress={() => router.push('/forgot-password/step1')}
        >
          <Text style={styles.orangeText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]} onPress={handleLogin} disabled={isSubmitting}>
          <Text style={styles.loginButtonText}>{isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.greyText}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/register/step1')}>
            <Text style={styles.orangeTextBold}>Regístrate</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.orangeText}>Continuar sin registrarse</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: 'white', width: '100%', maxWidth: 400, borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  logoWrapper: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2D3748', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#A0AEC0', marginBottom: 30 },
  inputLabel: { alignSelf: 'flex-start', fontSize: 12, color: '#4A5568', marginBottom: 8, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 15, height: 50, marginBottom: 20, backgroundColor: '#FAFAFA', width: '100%' },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#2D3748', height: '100%' },
  helperBanner: { width: '100%', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  helperBannerOffline: { backgroundColor: '#FFF4E5', borderWidth: 1, borderColor: '#FBD38D' },
  helperText: { color: '#9A3412', fontSize: 13, flex: 1, lineHeight: 18 },
  errorBanner: { width: '100%', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: '#FEF3F2', borderWidth: 1, borderColor: '#FDA29B' },
  errorText: { color: '#B42318', fontSize: 13, flex: 1, lineHeight: 18 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 30 },
  orangeText: { color: '#F27A1A', fontSize: 14 },
  loginButton: { backgroundColor: PRIMARY_BROWN, width: '100%', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  registerContainer: { flexDirection: 'row', marginBottom: 15 },
  greyText: { color: '#A0AEC0', fontSize: 14 },
  orangeTextBold: { color: '#F27A1A', fontSize: 14, fontWeight: 'bold' },
});
