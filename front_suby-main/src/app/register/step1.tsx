import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { CountryOption, listCountries } from '@/lib/api';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterStep1() {
  const { registrationDraft, setRegistrationDraft } = useAuth();
  const [formData, setFormData] = useState({
    nombre: registrationDraft?.nombre ?? '',
    apellido: registrationDraft?.apellido ?? '',
    email: registrationDraft?.email ?? '',
    pais: registrationDraft?.pais ?? '',
    domicilio: registrationDraft?.domicilio ?? '',
    documento: registrationDraft?.documento ?? '',
  });

  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCountryOptions() {
      try {
        const countries = await listCountries();
        if (!isMounted) {
          return;
        }

        setCountryOptions(countries);
      } catch {
        if (!isMounted) {
          return;
        }

        setCountryOptions([]);
      }
    }

    void loadCountryOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCountries = useMemo(
    () =>
      countryOptions.filter((country) =>
        country.name.toLowerCase().includes(formData.pais.toLowerCase())
      ),
    [countryOptions, formData.pais]
  );

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCountrySearch = (text: string) => {
    setFormData({ ...formData, pais: text });
    setShowDropdown(text.length > 0);
  };

  const selectCountry = (countryName: string) => {
    setFormData({ ...formData, pais: countryName });
    setShowDropdown(false);
  };

  const handleContinue = () => {
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.pais || !formData.domicilio || !formData.documento) {
      Alert.alert('Error', 'Por favor, completa todos los campos para continuar.');
      return;
    }

    if (!isValidEmail(formData.email)) {
      Alert.alert('Error', 'Ingresa un correo electronico valido.');
      return;
    }

    if (!countryOptions.some((country) => country.name === formData.pais)) {
      Alert.alert('Error', 'El pais ingresado no es valido o no esta en la lista.');
      return;
    }

    if (!/^\d{6,12}$/.test(formData.documento)) {
      Alert.alert('Error', 'Ingresa un numero de documento valido.');
      return;
    }

    setRegistrationDraft({
      ...formData,
      email: formData.email.trim().toLowerCase(),
      pais: formData.pais.trim(),
      domicilio: formData.domicilio.trim(),
    });
    router.push('/register/step2');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#F27A1A" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.stepText}>Paso 1 de 2</Text>
            <Text style={styles.stepTitle}>Datos Personales</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
          </View>

          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Completa tus datos personales</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color="#A0AEC0" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={formData.nombre}
                  onChangeText={(t) => setFormData({ ...formData, nombre: t.toUpperCase() })}
                />
              </View>
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Apellido</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color="#A0AEC0" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={formData.apellido}
                  onChangeText={(t) => setFormData({ ...formData, apellido: t.toUpperCase() })}
                />
              </View>
            </View>
          </View>

          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={18} color="#A0AEC0" style={styles.icon} />
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(t) => setFormData({ ...formData, email: t })}
            />
          </View>

          <Text style={styles.inputLabel}>Pais de Origen</Text>
          <View style={styles.inputContainer}>
            <Feather name="map-pin" size={18} color="#A0AEC0" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.pais}
              onChangeText={handleCountrySearch}
              placeholder="Ej: Argentina"
            />
          </View>

          {showDropdown && filteredCountries.length > 0 ? (
            <View style={styles.dropdown}>
              {filteredCountries.map((country) => (
                <TouchableOpacity key={country.id} style={styles.dropdownItem} onPress={() => selectCountry(country.name)}>
                  <Text style={styles.dropdownText}>{country.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Domicilio Legal</Text>
          <View style={styles.textAreaContainer}>
            <Feather name="file-text" size={18} color="#A0AEC0" style={styles.iconTop} />
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={3}
              value={formData.domicilio}
              onChangeText={(t) => setFormData({ ...formData, domicilio: t })}
            />
          </View>

          <Text style={styles.inputLabel}>Documento</Text>
          <View style={styles.inputContainer}>
            <Feather name="credit-card" size={18} color="#A0AEC0" style={styles.icon} />
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formData.documento}
              onChangeText={(t) => setFormData({ ...formData, documento: t.replace(/[^\d]/g, '') })}
              placeholder="Ej: 44333222"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  progressBarFill: { height: 6, backgroundColor: '#653728', borderRadius: 3, width: '50%' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2D3748', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#A0AEC0', marginBottom: 25 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  inputLabel: { fontSize: 12, color: '#4A5568', marginBottom: 5, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 10, height: 45, marginBottom: 15, backgroundColor: '#FAFAFA' },
  textAreaContainer: { flexDirection: 'row', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, height: 80, marginBottom: 25, backgroundColor: '#FAFAFA' },
  icon: { marginRight: 8 },
  iconTop: { marginRight: 8, marginTop: 2 },
  input: { flex: 1, color: '#2D3748' },
  textArea: { flex: 1, color: '#2D3748', textAlignVertical: 'top' },
  button: { backgroundColor: '#653728', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  dropdown: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, marginTop: -10, marginBottom: 15, elevation: 2, maxHeight: 150 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  dropdownText: { color: '#2D3748' },
});
