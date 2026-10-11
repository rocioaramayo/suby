import { Feather } from '@expo/vector-icons';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/context/auth-context';
import { verifyPasswordResetCode } from '@/lib/api';
import { PRIMARY_BROWN } from '@/theme/colors';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ForgotPasswordStep2() {
  const { passwordResetSession, setPasswordResetSession } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (!passwordResetSession?.email) {
      router.replace('/forgot-password/step1');
    }
  }, [passwordResetSession?.email]);

  const handleVerify = async () => {
    const fullCode = code.join('');

    if (fullCode.length !== 6 || !passwordResetSession?.email) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await verifyPasswordResetCode(passwordResetSession.email, fullCode);
      setPasswordResetSession({
        email: passwordResetSession.email,
        code: fullCode,
        token: response.token ?? passwordResetSession.token,
        userId: response.userId ?? passwordResetSession.userId,
      });
      router.replace('/forgot-password/step3');
    } catch (error) {
      Alert.alert('Codigo invalido', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.logoWrapper}>
            <BrandLogo size={84} variant="badge" />
          </View>

          <View style={styles.stepperContainer}>
            <View style={styles.step}>
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}><Feather name="check" size={16} color="white" /></View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Email</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={styles.step}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}><Text style={styles.stepTextActive}>2</Text></View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Codigo</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={styles.stepCircle}><Text style={styles.stepText}>3</Text></View>
              <Text style={styles.stepLabel}>Contrasena</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/forgot-password/step1')}>
            <Feather name="arrow-left" size={16} color="#A0AEC0" />
            <Text style={styles.backText}>Paso anterior</Text>
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Feather name="shield" size={24} color={PRIMARY_BROWN} />
          </View>

          <Text style={styles.title}>Ingresa el codigo</Text>
          <Text style={styles.subtitle}>Enviamos un codigo de 6 digitos a <Text style={{ fontWeight: 'bold', color: PRIMARY_BROWN }}>{passwordResetSession?.email ?? 'tu@email.com'}</Text></Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={[styles.codeInput, digit && styles.codeInputActive]}
                keyboardType="numeric"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, (code.join('').length < 6 || isSubmitting) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={code.join('').length < 6 || isSubmitting}
          >
            <Text style={styles.buttonText}>{isSubmitting ? 'Verificando...' : 'Verificar codigo'}</Text>
          </TouchableOpacity>

          <Text style={styles.timerText}>
            Reenviar codigo en <Text style={{ fontWeight: 'bold', color: PRIMARY_BROWN }}>{timeLeft}s</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F5F5F5', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  logoWrapper: { marginBottom: 25 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, width: '100%', justifyContent: 'center' },
  step: { alignItems: 'center' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  stepCircleActive: { backgroundColor: PRIMARY_BROWN },
  stepCircleCompleted: { backgroundColor: PRIMARY_BROWN },
  stepText: { color: '#A0AEC0', fontSize: 12, fontWeight: 'bold' },
  stepTextActive: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  stepLabel: { color: '#A0AEC0', fontSize: 10 },
  stepLabelActive: { color: PRIMARY_BROWN, fontWeight: 'bold' },
  stepLine: { width: 40, height: 2, backgroundColor: '#EDF2F7', marginHorizontal: 5, marginBottom: 15 },
  stepLineActive: { backgroundColor: PRIMARY_BROWN },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 30 },
  backText: { color: '#A0AEC0', marginLeft: 5, fontSize: 12 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FDF6E3', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#A0AEC0', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  codeInput: { width: 45, height: 55, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: '#2D3748', backgroundColor: '#FAFAFA' },
  codeInputActive: { borderColor: PRIMARY_BROWN, backgroundColor: 'white' },
  button: { backgroundColor: PRIMARY_BROWN, width: '100%', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  timerText: { color: '#A0AEC0', fontSize: 13 },
});
