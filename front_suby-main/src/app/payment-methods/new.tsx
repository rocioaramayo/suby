import { Feather } from '@expo/vector-icons';
import { PaymentMethodType, useAuth } from '@/context/auth-context';
import { CountryOption, createUserPaymentMethod, listCountries } from '@/lib/api';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const onlyDigits = (value: string) => value.replace(/[^\d]/g, '');
const cleanAmount = (value: string) => value.replace(/[^\d.]/g, '');

const formatExpiryInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const isValidExpiry = (value: string) => {
  const normalized = formatExpiryInput(value);
  if (!/^\d{2}\/\d{2}$/.test(normalized)) {
    return false;
  }

  const month = Number.parseInt(normalized.slice(0, 2), 10);
  return month >= 1 && month <= 12;
};

export default function NewPaymentMethodScreen() {
  const { session } = useAuth();
  const [methodType, setMethodType] = useState<PaymentMethodType>('card');
  const [isSaving, setIsSaving] = useState(false);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);

  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCountry, setBankCountry] = useState('Argentina');
  const [bankAccount, setBankAccount] = useState('');
  const [bankCbuIban, setBankCbuIban] = useState('');
  const [bankFunds, setBankFunds] = useState('');
  const [isForeignBank, setIsForeignBank] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [checkBankName, setCheckBankName] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkAmount, setCheckAmount] = useState('');
  const [checkIssueDate, setCheckIssueDate] = useState('');
  const [checkHolderName, setCheckHolderName] = useState('');

  const resetForm = useCallback(() => {
    setMethodType('card');
    setIsSaving(false);

    setCardHolder('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');

    setBankHolder('');
    setBankName('');
    setBankCountry('Argentina');
    setBankAccount('');
    setBankCbuIban('');
    setBankFunds('');
    setIsForeignBank(false);
    setShowCountryDropdown(false);

    setCheckBankName('');
    setCheckNumber('');
    setCheckAmount('');
    setCheckIssueDate('');
    setCheckHolderName('');
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCountries() {
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

    void loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  useEffect(() => {
    if (methodType !== 'bank') {
      return;
    }

    if (!isForeignBank) {
      setBankCountry('Argentina');
      setShowCountryDropdown(false);
    } else if (bankCountry.trim().toLowerCase() === 'argentina') {
      setBankCountry('');
    }
  }, [bankCountry, isForeignBank, methodType]);

  const bankCurrency = isForeignBank ? 'USD' : 'ARS';
  const selectableBankCountries = isForeignBank
    ? (countryOptions.length > 0 ? countryOptions.filter((country) => country.name !== 'Argentina') : [])
    : [{ id: 54, name: 'Argentina', shortName: 'AR' }];
  const bankAccountLabel = isForeignBank ? 'ABA / Routing Number o Numero de Cuenta' : 'CBU / CVU o Numero de Cuenta';
  const bankAccountPlaceholder = isForeignBank ? 'Routing, ABA o numero de cuenta' : 'Numero de cuenta o CVU';
  const bankCbuIbanLabel = isForeignBank ? 'IBAN / SWIFT' : 'CBU / Alias / IBAN';
  const bankCbuIbanPlaceholder = isForeignBank ? 'IBAN o codigo SWIFT' : 'CBU, alias o IBAN';

  const isValid = useMemo(() => {
    if (methodType === 'card') {
      return (
        cardHolder.trim().length > 1 &&
        onlyDigits(cardNumber).length === 16 &&
        isValidExpiry(cardExpiry) &&
        onlyDigits(cardCvc).length === 3
      );
    }

    if (methodType === 'bank') {
      return (
        bankName.trim().length > 1 &&
        (!isForeignBank
          ? bankCountry.trim() === 'Argentina'
          : selectableBankCountries.some((country) => country.name === bankCountry.trim())) &&
        bankHolder.trim().length > 1 &&
        bankAccount.trim().length > 5 &&
        bankCbuIban.trim().length > 5 &&
        Number.parseFloat(bankFunds || '0') > 0
      );
    }

    return (
      checkBankName.trim().length > 1 &&
      checkNumber.trim().length >= 4 &&
      Number.parseFloat(checkAmount || '0') > 0 &&
      checkIssueDate.trim().length === 10 &&
      checkHolderName.trim().length > 1
    );
  }, [
    bankCountry,
    bankCbuIban,
    bankAccount,
    bankFunds,
    bankHolder,
    bankName,
    cardCvc,
    cardExpiry,
    cardHolder,
    cardNumber,
    checkAmount,
    checkBankName,
    checkHolderName,
    checkIssueDate,
    checkNumber,
    methodType,
  ]);

  const handleSave = async () => {
    if (!isValid) {
      return;
    }

    if (!session?.userId || !session.token) {
      Alert.alert('Sesion requerida', 'Inicia sesion para guardar medios de pago.');
      return;
    }

    try {
      setIsSaving(true);

      if (methodType === 'card') {
        await createUserPaymentMethod(session.userId, session.token, {
          type: 'card',
          cardNumber: onlyDigits(cardNumber),
          cardHolder: cardHolder.trim(),
          expiry: formatExpiryInput(cardExpiry),
          cvv: onlyDigits(cardCvc),
        });
      }

      if (methodType === 'bank') {
        await createUserPaymentMethod(session.userId, session.token, {
          type: 'bank',
          bankName: bankName.trim(),
          country: bankCountry.trim(),
          accountHolder: bankHolder.trim(),
          accountNumber: bankAccount.trim(),
          cbuIban: bankCbuIban.trim(),
          reservedAmount: Number.parseFloat(bankFunds || '0'),
          isForeignBank,
        });
      }

      if (methodType === 'check') {
        await createUserPaymentMethod(session.userId, session.token, {
          type: 'check',
          bankName: checkBankName.trim(),
          checkNumber: checkNumber.trim(),
          amount: Number.parseFloat(checkAmount || '0'),
          issueDate: checkIssueDate.trim(),
          holderName: checkHolderName.trim(),
        });
      }

      router.replace({ pathname: '/payment-methods', params: { added: `${Date.now()}` } });
    } catch (error) {
      Alert.alert('No pudimos guardar el medio de pago', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTypeButton = (type: PaymentMethodType, label: string, icon: keyof typeof Feather.glyphMap) => {
    const active = methodType === type;

    return (
      <TouchableOpacity
        style={[styles.typeButton, active && styles.typeButtonActive]}
        onPress={() => setMethodType(type)}
      >
        <Feather name={icon} size={20} color={active ? '#653728' : '#60728F'} />
        <Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.headerBackground}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Medios de Pago</Text>
            <Text style={styles.headerSubtitle}>Gestiona tus metodos de pago</Text>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nuevo Medio de Pago</Text>
              <Text style={styles.label}>Tipo de Medio</Text>

              <View style={styles.typeRow}>
                {renderTypeButton('card', 'Tarjeta', 'credit-card')}
                {renderTypeButton('bank', 'Banco', 'briefcase')}
                {renderTypeButton('check', 'Cheque', 'file-text')}
              </View>

              {methodType === 'card' && (
                <View>
                  <Text style={styles.label}>Titular</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre como figura en la tarjeta"
                    placeholderTextColor="#9AA0AA"
                    value={cardHolder}
                    onChangeText={setCardHolder}
                  />

                  <Text style={styles.label}>Numero de Tarjeta</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor="#9AA0AA"
                    keyboardType="number-pad"
                    value={cardNumber}
                    onChangeText={(value) => setCardNumber(onlyDigits(value))}
                    maxLength={16}
                  />

                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Vencimiento</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MM/AA"
                        placeholderTextColor="#9AA0AA"
                        value={cardExpiry}
                        onChangeText={(value) => setCardExpiry(formatExpiryInput(value))}
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                    </View>

                    <View style={styles.halfField}>
                      <Text style={styles.label}>CVC</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        placeholderTextColor="#9AA0AA"
                        keyboardType="number-pad"
                        value={cardCvc}
                        onChangeText={(value) => setCardCvc(onlyDigits(value))}
                        maxLength={4}
                      />
                    </View>
                  </View>
                </View>
              )}

              {methodType === 'bank' && (
                <View>
                  <Text style={styles.label}>Banco</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: BNA, Santander, Galicia"
                    placeholderTextColor="#9AA0AA"
                    value={bankName}
                    onChangeText={setBankName}
                  />

                  {isForeignBank ? (
                    <>
                      <Text style={styles.label}>Pais</Text>
                      <TouchableOpacity
                        style={[styles.input, styles.selectInput]}
                        activeOpacity={0.85}
                        onPress={() => setShowCountryDropdown((prev) => !prev)}
                      >
                        <Text style={[styles.readonlyInputText, !bankCountry && styles.readonlyPlaceholder]}>
                          {bankCountry || 'Selecciona un pais'}
                        </Text>
                        <Feather
                          name={showCountryDropdown ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#60728F"
                        />
                      </TouchableOpacity>
                      {showCountryDropdown ? (
                        <View style={styles.dropdown}>
                          {selectableBankCountries.map((country, index) => (
                            <TouchableOpacity
                              key={country.id}
                              style={[styles.dropdownItem, index === selectableBankCountries.length - 1 && styles.dropdownItemLast]}
                              onPress={() => {
                                setBankCountry(country.name);
                                setShowCountryDropdown(false);
                              }}
                            >
                              <Text style={[styles.dropdownText, bankCountry === country.name && styles.dropdownTextActive]}>{country.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : null}

                  <Text style={styles.label}>Titular de la Cuenta</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre completo"
                    placeholderTextColor="#9AA0AA"
                    value={bankHolder}
                    onChangeText={setBankHolder}
                  />

                  <Text style={styles.label}>{bankAccountLabel}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={bankAccountPlaceholder}
                    placeholderTextColor="#9AA0AA"
                    value={bankAccount}
                    onChangeText={setBankAccount}
                  />

                  <Text style={styles.label}>{bankCbuIbanLabel}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={bankCbuIbanPlaceholder}
                    placeholderTextColor="#9AA0AA"
                    value={bankCbuIban}
                    onChangeText={setBankCbuIban}
                  />

                  <Text style={styles.label}>{`Fondos Disponibles para Subastas (${bankCurrency})`}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$ 0"
                    placeholderTextColor="#9AA0AA"
                    keyboardType="decimal-pad"
                    value={bankFunds}
                    onChangeText={(value) => setBankFunds(cleanAmount(value))}
                  />

                  <View style={styles.noteRow}>
                    <Feather name="info" size={13} color="#90A1BE" style={{ marginTop: 2 }} />
                    <Text style={styles.noteText}>Estos fondos quedaran reservados y no podran usarse durante la subasta.</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.toggleBox, isForeignBank && styles.toggleBoxActive]}
                    onPress={() => setIsForeignBank((prev) => !prev)}
                  >
                    <Text style={[styles.toggleText, isForeignBank && styles.toggleTextActive]}>
                      {isForeignBank ? 'Banco en el exterior' : 'Banco en Argentina'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {methodType === 'check' && (
                <View>
                  <View style={styles.warningBox}>
                    <Feather name="alert-circle" size={14} color="#D97706" style={{ marginTop: 2 }} />
                    <Text style={styles.warningText}>
                      El cheque certificado debe ser entregado fisicamente y verificado por Suby antes del inicio de la subasta en la que desees participar.
                    </Text>
                  </View>

                  <Text style={styles.label}>Banco</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Banco Nacion, Santander..."
                    placeholderTextColor="#9AA0AA"
                    value={checkBankName}
                    onChangeText={setCheckBankName}
                  />

                  <Text style={styles.label}>Numero de Cheque</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: CHK-000123"
                    placeholderTextColor="#9AA0AA"
                    value={checkNumber}
                    onChangeText={setCheckNumber}
                    autoCapitalize="characters"
                    maxLength={24}
                  />

                  <Text style={styles.label}>Monto (USD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$ 0"
                    placeholderTextColor="#9AA0AA"
                    keyboardType="decimal-pad"
                    value={checkAmount}
                    onChangeText={(value) => setCheckAmount(cleanAmount(value))}
                  />

                  <Text style={styles.label}>Fecha de Emision</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9AA0AA"
                    value={checkIssueDate}
                    onChangeText={setCheckIssueDate}
                  />

                  <Text style={styles.label}>Titular</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre completo"
                    placeholderTextColor="#9AA0AA"
                    value={checkHolderName}
                    onChangeText={setCheckHolderName}
                  />
                </View>
              )}

              <View style={styles.footerButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, (!isValid || isSaving) && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={!isValid || isSaving}
                >
                  <Text style={styles.saveButtonText}>{isSaving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6FA' },
  container: { flex: 1 },
  headerBackground: {
    backgroundColor: '#653728',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: { width: 28, marginBottom: 6 },
  headerTitle: { color: 'white', fontSize: 42 / 2, fontWeight: '700' },
  headerSubtitle: { color: '#E4D3CB', fontSize: 18 / 2, marginTop: 4 },
  content: { padding: 22, paddingBottom: 36 },
  card: {
    backgroundColor: 'white',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { color: '#1E2D45', fontSize: 21 / 2, fontWeight: '700', marginBottom: 18 },
  label: { color: '#34455F', fontSize: 15 / 1.2, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  typeButton: {
    flex: 1,
    height: 72,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F7F9FC',
  },
  typeButtonActive: { borderColor: '#C18772', backgroundColor: '#FFFDFC' },
  typeButtonText: { color: '#60728F', fontSize: 14, fontWeight: '600' },
  typeButtonTextActive: { color: '#653728' },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 14,
    marginBottom: 14,
    color: '#1F2E46',
    fontSize: 15,
  },
  readonlyInput: {
    justifyContent: 'center',
  },
  readonlyInputText: {
    color: '#1F2E46',
    fontSize: 15,
    flex: 1,
  },
  readonlyPlaceholder: {
    color: '#9AA0AA',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputDisabled: {
    opacity: 0.8,
  },
  dropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DEE6F1',
    borderRadius: 14,
    marginTop: -6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownText: {
    color: '#60728F',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownTextActive: {
    color: '#653728',
  },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  noteRow: { flexDirection: 'row', gap: 6, marginTop: -2, marginBottom: 12 },
  noteText: { flex: 1, color: '#90A1BE', fontSize: 13, lineHeight: 20 },
  toggleBox: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D6CB',
    backgroundColor: '#FAF5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toggleBoxActive: { borderColor: '#653728', backgroundColor: '#F2E7E1' },
  toggleText: { color: '#7D5848', fontWeight: '600', fontSize: 17 },
  toggleTextActive: { color: '#653728' },
  warningBox: {
    borderWidth: 1,
    borderColor: '#F2D9A6',
    backgroundColor: '#FFF9E9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  warningText: { flex: 1, color: '#B45309', fontSize: 13, lineHeight: 19 },
  footerButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: { color: '#4D607D', fontSize: 16, fontWeight: '700' },
  saveButton: {
    flex: 1,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#653728',
    shadowColor: '#653728',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
