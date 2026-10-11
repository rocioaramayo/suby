import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { BrandLogo } from '@/components/brand-logo';
import { requestPasswordReset } from '@/lib/api';
import { PRIMARY_BROWN } from '@/theme/colors';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ForgotPasswordStep1() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setPasswordResetSession } = useAuth();

  const handleContinue = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Por favor, ingresá un correo válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedEmail = email.trim().toLowerCase();
      const response = await requestPasswordReset(normalizedEmail);
      setPasswordResetSession({
        email: normalizedEmail,
        token: response.token,
        userId: response.userId,
      });
      // USAMOS REPLACE para no dejar esta pantalla en el stack
      router.replace('/forgot-password/step2');
    } catch (error) {
      Alert.alert('No pudimos enviar el código', error instanceof Error ? error.message : 'Intentá nuevamente.');
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

          {/* Stepper */}
          <View style={styles.stepperContainer}>
            <View style={styles.step}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}><Text style={styles.stepTextActive}>1</Text></View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Email</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={styles.stepCircle}><Text style={styles.stepText}>2</Text></View>
              <Text style={styles.stepLabel}>Código</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={styles.stepCircle}><Text style={styles.stepText}>3</Text></View>
              <Text style={styles.stepLabel}>Contraseña</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/login')}>
            <Feather name="arrow-left" size={16} color="#A0AEC0" />
            <Text style={styles.backText}>Volver al inicio</Text>
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Feather name="mail" size={24} color={PRIMARY_BROWN} />
          </View>

          <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
          <Text style={styles.subtitle}>Ingresa tu email y te enviaremos un código de verificación</Text>

          <Text style={styles.inputLabel}>Correo electrónico</Text>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={18} color="#A0AEC0" style={styles.icon} />
            <TextInput 
              style={styles.input} 
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <TouchableOpacity style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleContinue} disabled={isSubmitting}>
            <Text style={styles.buttonText}>{isSubmitting ? 'Enviando...' : 'Enviar código'}</Text>
          </TouchableOpacity>
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
  stepText: { color: '#A0AEC0', fontSize: 12, fontWeight: 'bold' },
  stepTextActive: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  stepLabel: { color: '#A0AEC0', fontSize: 10 },
  stepLabelActive: { color: PRIMARY_BROWN, fontWeight: 'bold' },
  stepLine: { width: 40, height: 2, backgroundColor: '#EDF2F7', marginHorizontal: 5, marginBottom: 15 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 30 },
  backText: { color: '#A0AEC0', marginLeft: 5, fontSize: 12 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FDF6E3', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#A0AEC0', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
  inputLabel: { alignSelf: 'flex-start', fontSize: 12, color: '#4A5568', marginBottom: 8, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 10, height: 50, marginBottom: 25, backgroundColor: '#FAFAFA', width: '100%' },
  icon: { marginRight: 8 },
  input: { flex: 1, color: '#2D3748' },
  button: { backgroundColor: PRIMARY_BROWN, width: '100%', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
