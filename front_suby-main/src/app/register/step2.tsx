import { useAuth } from '@/context/auth-context';
import { isAlreadyApprovedError, isDuplicateOnboardingError, isUnknownOnboardingResultError, registerOnboarding } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RegisterStep2() {
  const { registrationDraft, setRegistrationDraft } = useAuth();
  const [frenteAsset, setFrenteAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dorsoAsset, setDorsoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función para manejar la selección de imagen
  const handleImagePick = (side: 'frente' | 'dorso') => {
    Alert.alert(
      "Subir Documento",
      "¿Desde dónde quieres subir la imagen?",
      [
        { text: "Cámara", onPress: () => openCamera(side) },
        { text: "Galería", onPress: () => openGallery(side) },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  const openCamera = async (side: 'frente' | 'dorso') => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permiso denegado", "Necesitas dar permisos de cámara para continuar.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (side === 'frente') setFrenteAsset(result.assets[0]);
      else setDorsoAsset(result.assets[0]);
    }
  };

  const openGallery = async (side: 'frente' | 'dorso') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (side === 'frente') setFrenteAsset(result.assets[0]);
      else setDorsoAsset(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!frenteAsset || !dorsoAsset) {
      Alert.alert('Error', 'Debes subir tanto el frente como el dorso del documento para continuar.');
      return;
    }

    if (!registrationDraft) {
      Alert.alert('Falta información', 'Primero completá tus datos personales.');
      router.replace('/register/step1');
      return;
    }

    try {
      setIsSubmitting(true);
      await registerOnboarding({
        ...registrationDraft,
        frontalUri: frenteAsset.uri,
        frontalName: frenteAsset.fileName ?? undefined,
        frontalType: frenteAsset.mimeType ?? undefined,
        backUri: dorsoAsset.uri,
        backName: dorsoAsset.fileName ?? undefined,
        backType: dorsoAsset.mimeType ?? undefined,
      });
      setRegistrationDraft(null);
      router.replace('/register/success');
    } catch (error) {
      if (isAlreadyApprovedError(error)) {
        setRegistrationDraft(null);
        Alert.alert(
          'Esta cuenta ya está activa',
          'El email ingresado ya tiene una cuenta aprobada en Suby. Podés iniciar sesión directamente.',
          [{ text: 'Ir al inicio de sesión', onPress: () => router.replace('/login' as never) }]
        );
        return;
      }
      
      if (isDuplicateOnboardingError(error)) {
        setRegistrationDraft(null);
        Alert.alert(
          'Solicitud ya registrada',
          'Ese mail ya tiene una solicitud cargada. Te llevamos al estado de solicitud para que no tengas que reenviarla.'
        );
        router.replace({ pathname: '/register/success', params: { status: 'duplicate' } });
        return;
      }

      if (isUnknownOnboardingResultError(error)) {
        setRegistrationDraft(null);
        Alert.alert(
          'Solicitud enviada',
          'La solicitud parece haberse guardado, pero la app no pudo confirmar la respuesta final. Te llevamos al estado de solicitud enviada.'
        );
        router.replace({ pathname: '/register/success', params: { status: 'unknown' } });
        return;
      }

      Alert.alert('No pudimos enviar el registro', error instanceof Error ? error.message : 'Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color="#F27A1A" />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.stepText}>Paso 2 de 2</Text>
          <Text style={styles.stepTitle}>Documentación</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={styles.progressBarFill} />
        </View>

        <Text style={styles.title}>Documentación</Text>
        <Text style={styles.subtitle}>Sube tu documentación para verificación</Text>

        {/* Botón Frente */}
        <TouchableOpacity style={styles.uploadBox} onPress={() => handleImagePick('frente')}>
          {frenteAsset ? (
            <View style={styles.successBox}>
               <Feather name="check-circle" size={30} color="#48BB78" style={{ marginBottom: 10 }} />
               <Text style={styles.uploadTitle}>Frente cargado con éxito</Text>
               <Text style={styles.reselectText}>Toca para cambiar</Text>
            </View>
          ) : (
            <>
              <Feather name="upload" size={24} color="#A0AEC0" style={{ marginBottom: 10 }} />
              <Text style={styles.uploadTitle}>Documento (Frente)</Text>
              <Text style={styles.uploadSubtitle}>Haz clic para tomar foto o subir archivo</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botón Dorso */}
        <TouchableOpacity style={styles.uploadBox} onPress={() => handleImagePick('dorso')}>
          {dorsoAsset ? (
             <View style={styles.successBox}>
                <Feather name="check-circle" size={30} color="#48BB78" style={{ marginBottom: 10 }} />
                <Text style={styles.uploadTitle}>Dorso cargado con éxito</Text>
                <Text style={styles.reselectText}>Toca para cambiar</Text>
             </View>
          ) : (
            <>
              <Feather name="upload" size={24} color="#A0AEC0" style={{ marginBottom: 10 }} />
              <Text style={styles.uploadTitle}>Documento (Dorso)</Text>
              <Text style={styles.uploadSubtitle}>Haz clic para tomar foto o subir archivo</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold' }}>Importante:</Text> Tus documentos serán verificados por nuestra empresa. Recibirás un email cuando el proceso esté completo.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, (!frenteAsset || !dorsoAsset || isSubmitting) && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={!frenteAsset || !dorsoAsset || isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Enviando...' : 'Enviar Registro'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F5F5F5', padding: 20, paddingTop: 50 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { color: '#F27A1A', marginLeft: 5, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stepText: { fontWeight: 'bold', color: '#2D3748' },
  stepTitle: { color: '#A0AEC0', fontSize: 12 },
  progressBarBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginBottom: 25 },
  progressBarFill: { height: 6, backgroundColor: '#653728', borderRadius: 3, width: '100%' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2D3748', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#A0AEC0', marginBottom: 25 },
  uploadBox: { borderWidth: 1, borderColor: '#CBD5E0', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 20, backgroundColor: '#FAFAFA' },
  successBox: { alignItems: 'center' },
  uploadTitle: { fontWeight: '600', color: '#4A5568', marginBottom: 5 },
  uploadSubtitle: { fontSize: 12, color: '#A0AEC0' },
  reselectText: { fontSize: 12, color: '#F27A1A', marginTop: 5 },
  infoBox: { backgroundColor: '#FDF6E3', padding: 15, borderRadius: 10, marginBottom: 25 },
  infoText: { color: '#7B3F00', fontSize: 13, lineHeight: 20 },
  button: { backgroundColor: '#653728', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#A0AEC0' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
