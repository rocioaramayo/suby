import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { BrandLogo } from '@/components/brand-logo';
import { resetPassword } from '@/lib/api';
import { PRIMARY_BROWN } from '@/theme/colors';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ForgotPasswordStep3() {
  const { passwordResetSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validaciones
  const [validations, setValidations] = useState({
    length: false, upper: false, number: false, symbol: false
  });

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  const isValid = Object.values(validations).every(Boolean) && password === confirmPassword && password !== '';

  useEffect(() => {
    if (!passwordResetSession?.email || !passwordResetSession?.code) {
      router.replace('/forgot-password/step1');
    }
  }, [passwordResetSession?.code, passwordResetSession?.email]);

  const handleReset = async () => {
    if (!isValid) {
      return;
    }

    if (!passwordResetSession?.email || !passwordResetSession.code) {
      Alert.alert(
        'Faltan datos',
        'Necesitamos el email y el código verificado para completar el cambio de contraseña.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword({
        email: passwordResetSession.email,
        code: passwordResetSession.code,
        password,
        passwordConfirmation: confirmPassword,
      });
      // Navegamos a la pantalla de éxito real
      router.replace('/forgot-password/success');
    } catch (error) {
      Alert.alert('No pudimos restablecer la contraseña', error instanceof Error ? error.message : 'Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrengthLevel = () => {
    const passed = Object.values(validations).filter(Boolean).length;
    return passed; // 0 a 4
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          
          <View style={styles.logoWrapper}>
            <BrandLogo size={84} variant="badge" />
          </View>

          {/* Stepper */}
          <View style={styles.stepperContainer}>
            <View style={styles.step}>
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}><Feather name="check" size={16} color="white" /></View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Email</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={styles.step}>
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}><Feather name="check" size={16} color="white" /></View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Código</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={styles.step}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}><Text style={styles.stepTextActive}>3</Text></View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Contraseña</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={16} color="#A0AEC0" />
            <Text style={styles.backText}>Paso anterior</Text>
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Feather name="lock" size={24} color={PRIMARY_BROWN} />
          </View>

          <Text style={styles.title}>Nueva contraseña</Text>
          <Text style={styles.subtitle}>Elige una contraseña segura para tu cuenta</Text>

          <Text style={styles.inputLabel}>Nueva contraseña</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A0AEC0" style={styles.icon} />
            <TextInput 
              style={styles.input} 
              placeholder="Mínimo 8 caracteres"
              secureTextEntry={!showPass1}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass1(!showPass1)}>
              <Feather name={showPass1 ? "eye" : "eye-off"} size={18} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          {/* Barra de seguridad */}
          <View style={styles.strengthContainer}>
             {[1,2,3,4].map(level => (
               <View key={level} style={[styles.strengthBar, getStrengthLevel() >= level ? styles.strengthBarActive : null]} />
             ))}
          </View>
          <Text style={styles.strengthText}>{getStrengthLevel() === 4 ? 'Fuerte' : 'Débil'}</Text>

          <Text style={styles.inputLabel}>Confirmar contraseña</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A0AEC0" style={styles.icon} />
            <TextInput 
              style={styles.input} 
              placeholder="Repite tu contraseña"
              secureTextEntry={!showPass2}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowPass2(!showPass2)}>
              <Feather name={showPass2 ? "eye" : "eye-off"} size={18} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          {/* Lista de validaciones */}
          <View style={styles.validationBox}>
            <ValidationItem text="Mínimo 8 caracteres" isValid={validations.length} />
            <ValidationItem text="Al menos una mayúscula" isValid={validations.upper} />
            <ValidationItem text="Al menos un número" isValid={validations.number} />
            <ValidationItem text="Al menos un símbolo" isValid={validations.symbol} />
          </View>

          <TouchableOpacity 
            style={[styles.button, (!isValid || isSubmitting) && styles.buttonDisabled]} 
            onPress={handleReset}
            disabled={!isValid || isSubmitting}
          >
            <Text style={styles.buttonText}>{isSubmitting ? 'Actualizando...' : 'Restablecer contraseña'}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ValidationItem = ({ text, isValid }: { text: string, isValid: boolean }) => (
  <View style={styles.valItem}>
    <View style={[styles.valCircle, isValid && styles.valCircleActive]}>
       {isValid && <Feather name="check" size={8} color="white" />}
    </View>
    <Text style={[styles.valText, isValid && styles.valTextActive]}>{text}</Text>
  </View>
);

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
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: '#A0AEC0', marginLeft: 5, fontSize: 12 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FDF6E3', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', marginBottom: 10 },
  subtitle: { fontSize: 13, color: '#A0AEC0', textAlign: 'center', marginBottom: 20 },
  inputLabel: { alignSelf: 'flex-start', fontSize: 12, color: '#4A5568', marginBottom: 8, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 10, height: 50, marginBottom: 10, backgroundColor: '#FAFAFA', width: '100%' },
  icon: { marginRight: 8 },
  input: { flex: 1, color: '#2D3748' },
  strengthContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 5 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#EDF2F7', borderRadius: 2, marginHorizontal: 2 },
  strengthBarActive: { backgroundColor: '#48BB78' },
  strengthText: { alignSelf: 'flex-start', fontSize: 10, color: '#48BB78', marginBottom: 15, fontWeight: 'bold', marginLeft: 5 },
  validationBox: { backgroundColor: '#F7FAFC', width: '100%', padding: 15, borderRadius: 10, marginBottom: 20 },
  valItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  valCircle: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  valCircleActive: { backgroundColor: '#48BB78' },
  valText: { fontSize: 12, color: '#A0AEC0' },
  valTextActive: { color: '#48BB78' },
  button: { backgroundColor: PRIMARY_BROWN, width: '100%', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
