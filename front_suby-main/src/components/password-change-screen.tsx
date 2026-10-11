import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { changePassword } from '@/lib/api';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type PasswordChangeScreenProps = {
  title: string;
  subtitle: string;
  toastMessage: string;
  successRoute: '/login' | '/(tabs)';
  buttonLabel?: string;
};

export function PasswordChangeScreen({
  title,
  subtitle,
  toastMessage,
  successRoute,
  buttonLabel = 'Restablecer contraseña',
}: PasswordChangeScreenProps) {
  const { passwordResetSession, session, setPasswordResetSession, setSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validations = useMemo(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }),
    [password]
  );

  const strengthScore = Object.values(validations).filter(Boolean).length;
  const allValid = Object.values(validations).every(Boolean) && password === confirmPassword && password !== '';

  useEffect(() => {
    const userId = passwordResetSession?.userId ?? session?.userId;
    const token = passwordResetSession?.token ?? session?.token;

    if (!userId || !token) {
      router.replace('/login');
    }
  }, [passwordResetSession?.token, passwordResetSession?.userId, session?.token, session?.userId]);

  const getStrengthColor = () => {
    if (strengthScore <= 1) return '#E1574C';
    if (strengthScore <= 3) return '#F0A34A';
    return '#2DBE60';
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (strengthScore <= 1) return 'Débil';
    if (strengthScore <= 3) return 'Media';
    return 'Fuerte';
  };

  const handleSubmit = async () => {
    if (!allValid) {
      return;
    }

    const userId = passwordResetSession?.userId ?? session?.userId;
    const token = passwordResetSession?.token ?? session?.token;

    if (!userId || !token) {
      Alert.alert(
        'No pudimos continuar',
        'Necesitamos una sesión válida para actualizar la contraseña. Iniciá sesión nuevamente.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await changePassword({
        userId,
        token,
        password,
        passwordConfirmation: confirmPassword,
      });
      if (passwordResetSession?.pendingSession) {
        setSession(passwordResetSession.pendingSession);
      }
      setPasswordResetSession(null);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.replace(successRoute);
      }, 1800);
    } catch (error) {
      Alert.alert('No pudimos actualizar la contraseña', error instanceof Error ? error.message : 'Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {showToast && (
        <View style={styles.toastContainer}>
          <TouchableOpacity onPress={() => setShowToast(false)} style={styles.toastCloseButton}>
            <Feather name="x" size={14} color="#8BD5A9" />
          </TouchableOpacity>
          <Feather name="check-circle" size={18} color="#17A34A" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenLabel}>Cuenta Aprobada</Text>

        <View style={styles.card}>
          <View style={styles.headerSection}>
            <View style={styles.checkCircle}>
              <Feather name="check" size={28} color="#12A548" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.infoBox}>
              <Feather name="info" size={16} color="#2F6FED" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Podés explorar las subastas sin agregar un medio de pago. Para pujar, necesitarás configurar al
                menos uno desde tu perfil.
              </Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.inputLabel}>Nueva contraseña</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={18} color="#A0AEC0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="@qdqwejNADS8291"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPass1}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass1((current) => !current)}>
                <Feather name={showPass1 ? 'eye' : 'eye-off'} size={18} color="#A0AEC0" />
              </TouchableOpacity>
            </View>

            {password.length > 0 && (
              <View style={styles.strengthWrapper}>
                <View style={styles.strengthSegments}>
                  {[0, 1, 2, 3].map((segment) => (
                    <View
                      key={segment}
                      style={[
                        styles.strengthSegment,
                        segment < strengthScore && { backgroundColor: getStrengthColor() },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>{getStrengthLabel()}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Confirmar contraseña</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={18} color="#A0AEC0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="@qdqwejNADS8291"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPass2}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowPass2((current) => !current)}>
                <Feather name={showPass2 ? 'eye' : 'eye-off'} size={18} color="#A0AEC0" />
              </TouchableOpacity>
            </View>

            <View style={styles.validationList}>
              <ValidationItem label="Mínimo 8 caracteres" isValid={validations.length} />
              <ValidationItem label="Al menos una mayúscula" isValid={validations.upper} />
              <ValidationItem label="Al menos un número" isValid={validations.number} />
              <ValidationItem label="Al menos un símbolo" isValid={validations.symbol} />
            </View>

            <TouchableOpacity
              style={[styles.button, (!allValid || isSubmitting) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!allValid || isSubmitting}
            >
              <Text style={styles.buttonText}>{isSubmitting ? 'Guardando...' : buttonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ValidationItem({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <View style={styles.validationItem}>
      <View style={[styles.validationIcon, isValid && styles.validationIconActive]}>
        <Feather name="check" size={11} color="white" />
      </View>
      <Text style={[styles.validationText, isValid && styles.validationTextActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4F1',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  screenLabel: {
    color: '#B1B1B1',
    fontSize: 18,
    marginBottom: 14,
    paddingLeft: 4,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    maxWidth: 430,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#433126',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
    width: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#DDF8E6',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    marginBottom: 18,
    width: 68,
  },
  title: {
    color: '#1F2A44',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6880A7',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#EEF5FF',
    borderColor: '#B9D3FF',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    color: '#295FCA',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  formSection: {
    marginTop: 6,
  },
  inputLabel: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: '#FCFCFD',
    borderColor: '#E5E7EB',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    color: '#1F2937',
    flex: 1,
    fontSize: 16,
  },
  strengthWrapper: {
    marginBottom: 18,
    marginTop: -2,
  },
  strengthSegments: {
    flexDirection: 'row',
    gap: 5,
  },
  strengthSegment: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    flex: 1,
    height: 6,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 7,
  },
  validationList: {
    marginTop: 10,
  },
  validationItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  validationIcon: {
    alignItems: 'center',
    backgroundColor: '#C4C9D0',
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    marginRight: 10,
    width: 18,
  },
  validationIconActive: {
    backgroundColor: '#20BF55',
  },
  validationText: {
    color: '#9AA3B2',
    fontSize: 14,
  },
  validationTextActive: {
    color: '#20BF55',
    fontWeight: '500',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#653728',
    borderRadius: 15,
    height: 54,
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#653728',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  toastContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#EAFBF0',
    borderColor: '#C8F0D5',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    left: 18,
    maxWidth: 430,
    minHeight: 58,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 18,
    top: 58,
    zIndex: 20,
  },
  toastCloseButton: {
    left: -4,
    marginRight: 8,
    padding: 2,
    position: 'absolute',
    top: -9,
  },
  toastText: {
    color: '#14A148',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
});
