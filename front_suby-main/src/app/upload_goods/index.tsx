import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage, listUserPaymentMethods, PaymentMethod, uploadUserProduct } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PHOTO_SLOTS = 6;
const REQUIRED_DOCUMENTS = 2;
const MAX_PHOTO_DIMENSION = 1600;
const PHOTO_COMPRESS_QUALITY = 0.45;
const CURRENCY_OPTIONS: Array<'ARS' | 'USD'> = ['ARS', 'USD'];

const CATEGORIES = ['Joyería', 'Arte', 'Vehículos', 'Mobiliaria', 'Otras...'];

const C = {
  bg: '#F7F8FB',
  card: '#FFFFFF',
  border: '#E3EAF3',
  text: '#25344C',

  muted: '#8FA1BD',
  brown: '#653728',
  brownDeep: '#653728',
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  amber: '#F59E0B',
  amberSoft: '#FFF8E6',
};

function EmptyPhotoSlot({ isPrimary, onPress }: { isPrimary?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.photoSlot} activeOpacity={0.85} onPress={onPress}>
      {isPrimary ? <Text style={styles.primaryBadge}>Principal</Text> : null}
      <Feather name="camera" size={18} color={C.muted} />
      <Text style={styles.photoHint}>Agregar foto</Text>
    </TouchableOpacity>
  );
}

export default function UploadGoodsScreen() {
  const { session } = useAuth();
  
  const [formValues, setFormValues] = useState({
    category: '',
    title: '',
    condition: '',
    origin: '',
    description: '',
    preferredCurrency: 'ARS' as 'ARS' | 'USD',
    acceptsUsd: false,
    isArt: false,
    artist: '',
    creationDate: '',
    historicalContext: '',
  });

  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [photos, setPhotos] = useState<(ImagePicker.ImagePickerAsset | null)[]>(
    Array.from({ length: PHOTO_SLOTS }, () => null)
  );
  const [documentAssets, setDocumentAssets] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [bankPaymentMethods, setBankPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedReceivingAccountId, setSelectedReceivingAccountId] = useState<number | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadBankPaymentMethods = useCallback(async () => {
    if (!session?.userId || !session.token) {
      setBankPaymentMethods([]);
      setSelectedReceivingAccountId(null);
      setIsLoadingPaymentMethods(false);
      return;
    }

    try {
      setIsLoadingPaymentMethods(true);
      const methods = await listUserPaymentMethods(session.userId, session.token);
      const bankMethods = methods.filter((method) => method.type === 'bank');
      setBankPaymentMethods(bankMethods);
      setSelectedReceivingAccountId((current) => {
        if (current && bankMethods.some((method) => Number(method.id) === current)) {
          return current;
        }

        const firstId = Number(bankMethods[0]?.id);
        return Number.isFinite(firstId) ? firstId : null;
      });
    } catch {
      setBankPaymentMethods([]);
      setSelectedReceivingAccountId(null);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  }, [session?.token, session?.userId]);

  useEffect(() => {
    void loadBankPaymentMethods();
  }, [loadBankPaymentMethods]);

  useFocusEffect(
    useCallback(() => {
      void loadBankPaymentMethods();
    }, [loadBankPaymentMethods])
  );

  const optimizePhotoAsset = async (
    asset: ImagePicker.ImagePickerAsset,
    slotIndex: number
  ): Promise<ImagePicker.ImagePickerAsset> => {
    const shouldResize = asset.width > MAX_PHOTO_DIMENSION || asset.height > MAX_PHOTO_DIMENSION;
    const resizeAction = shouldResize
      ? asset.width >= asset.height
        ? [{ resize: { width: MAX_PHOTO_DIMENSION } }]
        : [{ resize: { height: MAX_PHOTO_DIMENSION } }]
      : [];

    const optimized = await manipulateAsync(asset.uri, resizeAction, {
      compress: PHOTO_COMPRESS_QUALITY,
      format: SaveFormat.JPEG,
    });

    return {
      ...asset,
      uri: optimized.uri,
      width: optimized.width,
      height: optimized.height,
      fileName: `photo-${slotIndex + 1}.jpg`,
      mimeType: 'image/jpeg',
      type: 'image',
    };
  };

  const pickImage = async (slotIndex: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: PHOTO_COMPRESS_QUALITY,
      allowsEditing: true,
    });

    if (result.canceled) {
      return;
    }

    let optimizedAsset = result.assets[0];

    try {
      optimizedAsset = await optimizePhotoAsset(result.assets[0], slotIndex);
    } catch {
      optimizedAsset = result.assets[0];
    }

    setPhotos((current) => current.map((item, index) => (index === slotIndex ? optimizedAsset : item)));
  };

  const pickDocumentEvidence = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    setDocumentAssets(result.assets.slice(0, REQUIRED_DOCUMENTS));
  };

  const handleSubmit = async () => {
    const uploadedPhotos = photos.filter((photo): photo is ImagePicker.ImagePickerAsset => Boolean(photo));
    const selectedReceivingAccount =
      bankPaymentMethods.find((method) => Number(method.id) === selectedReceivingAccountId) ?? null;

    if (!formValues.category.trim()) {
      Alert.alert('Falta categoría', 'Debés seleccionar una categoría para continuar.');
      return;
    }

    if (
      !formValues.title.trim() ||
      !formValues.condition.trim() ||
      !formValues.origin.trim() ||
      !formValues.description.trim()
    ) {
      Alert.alert('Faltan datos', 'Completá la información principal del artículo antes de enviarlo.');
      return;
    }

    if (
      formValues.isArt &&
      (!formValues.artist.trim() || !formValues.creationDate.trim() || !formValues.historicalContext.trim())
    ) {
      Alert.alert('Faltan datos de arte', 'Si el artículo es arte, completá autor, fecha y contexto histórico.');
      return;
    }

    if (uploadedPhotos.length < PHOTO_SLOTS) {
      Alert.alert('Faltan fotografías', 'Debés subir las 6 fotos para continuar.');
      return;
    }

    if (documentAssets.length < REQUIRED_DOCUMENTS) {
      Alert.alert('Falta documentación', 'Debés adjuntar 2 archivos para continuar.');
      return;
    }

    if (!selectedReceivingAccountId) {
      Alert.alert('Cuenta receptora requerida', 'Agregá una cuenta bancaria para recibir el dinero del bien.');
      return;
    }

    if (!selectedReceivingAccount) {
      Alert.alert('Cuenta receptora inválida', 'Seleccioná una cuenta bancaria válida para continuar.');
      return;
    }

    const selectedAccountCurrency = (selectedReceivingAccount.currency ?? 'ARS').toUpperCase();
    if (selectedAccountCurrency !== formValues.preferredCurrency) {
      Alert.alert(
        'Cuenta incompatible',
        `Si la operación es en ${formValues.preferredCurrency}, tenés que elegir una cuenta en ${formValues.preferredCurrency}.`
      );
      return;
    }

    if (!acceptedDeclaration) {
      Alert.alert('Declaración requerida', 'Debés aceptar la declaración para enviar la solicitud.');
      return;
    }

    if (!session?.token || !session.userId) {
      Alert.alert('Sesión requerida', 'Iniciá sesión nuevamente para enviar el artículo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await uploadUserProduct({
        userId: session.userId,
        token: session.token,
        category: formValues.category.trim(), 

        name: formValues.title.trim(),
        condition: formValues.condition.trim(),
        originProvenance: formValues.origin.trim(),
        fullDescription: formValues.description.trim(),
        receivingAccountId: selectedReceivingAccountId,
        preferredCurrency: formValues.preferredCurrency,
        acceptsUsd: formValues.acceptsUsd,
        ownershipDeclaration: acceptedDeclaration,
        isArt: formValues.isArt,
        artist: formValues.artist.trim(),
        creationDate: formValues.creationDate.trim(),
        historicalContext: formValues.historicalContext.trim(),
        photos: uploadedPhotos.map((photo) => ({
          uri: photo.uri,
          fileName: photo.fileName,
          mimeType: photo.mimeType,
        })),
        originDocs: documentAssets.map((documentAsset) => ({
          uri: documentAsset.uri,
          fileName: documentAsset.name,
          mimeType: documentAsset.mimeType,
        })),
      });

      Alert.alert('Solicitud enviada', response.message);
      router.back();
    } catch (error) {
      Alert.alert('No pudimos enviar el artículo', getApiErrorMessage(error, 'Intentá nuevamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enviar artículo</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fotografías</Text>
            <Text style={styles.sectionHint}>6 obligatorias</Text>
          </View>

          <View style={styles.photoGrid}>
            {photos.map((photo, index) =>
              photo ? (
                <TouchableOpacity
                  key={`photo-${index}`}
                  style={styles.photoSlot}
                  activeOpacity={0.85}
                  onPress={() => pickImage(index)}
                >
                  {index === 0 ? <Text style={styles.primaryBadge}>Principal</Text> : null}
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                </TouchableOpacity>
              ) : (
                <EmptyPhotoSlot key={`photo-${index}`} isPrimary={index === 0} onPress={() => pickImage(index)} />
              )
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Descripción del bien</Text>

          <Text style={styles.inputLabel}>Categoría</Text>
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity 
              style={[styles.input, styles.dropdownToggle]} 
              activeOpacity={0.85}
              onPress={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
            >
              <Text style={{ color: formValues.category ? C.text : C.muted, fontSize: 15 }}>
                {formValues.category ? formValues.category : 'Seleccioná una categoría'}
              </Text>
              <Feather name={isCategoryPickerOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
            </TouchableOpacity>

            {isCategoryPickerOpen && (
              <View style={styles.dropdownListAbsolute}>
                {CATEGORIES.map((cat, index) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.dropdownItem,
                      index === CATEGORIES.length - 1 && styles.dropdownItemLast
                    ]}
                    onPress={() => {
                      handleInputChange('category', cat);
                      setIsCategoryPickerOpen(false);
                     
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.inputLabel}>Nombre del bien</Text>
          <TextInput 
            style={styles.input} 
            value={formValues.title} 
            onChangeText={(text) => handleInputChange('title', text)} 
            placeholder="Ej. Jarrón Dinastía Ming" 
          />

          <Text style={styles.inputLabel}>Estado de conservación</Text>
          <TextInput 
            style={styles.input} 
            value={formValues.condition} 
            onChangeText={(text) => handleInputChange('condition', text)} 
            placeholder="Ej. Excelente / Bueno / A restaurar" 
          />

          <Text style={styles.inputLabel}>Origen y procedencia</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={formValues.origin}
            onChangeText={(text) => handleInputChange('origin', text)}
            placeholder="Contá cómo llegó a vos, certificados, herencia, compra, etc."
            multiline
          />

          <Text style={styles.inputLabel}>Descripción completa</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={formValues.description}
            onChangeText={(text) => handleInputChange('description', text)}
            placeholder="Materiales, medidas, marcas, detalles y estado general."
            multiline
          />

          <Text style={styles.inputLabel}>Moneda preferida para la propuesta</Text>
          <View style={styles.choiceRow}>
            {CURRENCY_OPTIONS.map((currency) => {
              const isSelected = formValues.preferredCurrency === currency;
              return (
                <TouchableOpacity
                  key={currency}
                  style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
                  activeOpacity={0.85}
                  onPress={() => handleInputChange('preferredCurrency', currency)}
                >
                  <Text style={[styles.choiceButtonText, isSelected && styles.choiceButtonTextSelected]}>
                    {currency}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.sectionTitle}>Acepto propuestas en USD</Text>
              <Text style={styles.switchHint}>
                Esto no obliga a subastar en USD. Solo habilita que la propuesta comercial pueda cotizarse en esa moneda.
              </Text>
            </View>
            <Switch
              value={formValues.acceptsUsd}
              onValueChange={(value) => handleInputChange('acceptsUsd', value)}
              trackColor={{ true: '#D8F7E2' }}
              thumbColor={formValues.acceptsUsd ? C.green : '#fff'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.sectionTitle}>¿Es arte o pieza de autor?</Text>
              <Text style={styles.switchHint}>Si lo activás, pedimos datos curatoriales extra.</Text>
            </View>
            <Switch 
              value={formValues.isArt} 
              onValueChange={(value) => handleInputChange('isArt', value)} 
              trackColor={{ true: '#D8F7E2' }} 
              thumbColor={formValues.isArt ? C.green : '#fff'} 
            />
          </View>

          {formValues.isArt ? (
            <View style={styles.artBlock}>
              <Text style={styles.inputLabel}>Artista / autor</Text>
              <TextInput 
                style={styles.input} 
                value={formValues.artist} 
                onChangeText={(text) => handleInputChange('artist', text)} 
                placeholder="Ej. Benito Quinquela Martín" 
              />

              <Text style={styles.inputLabel}>Fecha de creación</Text>
              <TextInput
                style={styles.input}
                value={formValues.creationDate}
                onChangeText={(text) => handleInputChange('creationDate', text)}
                placeholder="AAAA-MM-DD"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Contexto histórico / ficha</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={formValues.historicalContext}
                onChangeText={(text) => handleInputChange('historicalContext', text)}
                placeholder="Período, movimiento, procedencia relevante y observaciones."
                multiline
              />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documentación</Text>
            <Text style={styles.sectionHint}>2 archivos</Text>
          </View>

          <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.85} onPress={pickDocumentEvidence}>
            <Feather name="paperclip" size={16} color={C.brown} />
            <Text style={styles.secondaryActionText}>Adjuntar archivos</Text>
          </TouchableOpacity>

          <View style={styles.documentsList}>
            {documentAssets.length > 0 ? (
              documentAssets.map((documentAsset) => (
                <View key={documentAsset.uri} style={styles.documentRow}>
                  <Feather name="file-text" size={16} color={C.brown} />
                  <Text style={styles.documentName} numberOfLines={1}>{documentAsset.name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.helperText}>Todavía no cargaste los archivos requeridos.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cuenta para recibir el pago</Text>
          {isLoadingPaymentMethods ? (
            <Text style={styles.helperText}>Cargando cuentas bancarias…</Text>
          ) : bankPaymentMethods.length === 0 ? (
            <Text style={styles.helperText}>Necesitás al menos una cuenta bancaria cargada en Medios de Pago.</Text>
          ) : (
            bankPaymentMethods.map((method) => {
              const isSelected = Number(method.id) === selectedReceivingAccountId;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.accountCard, isSelected && styles.accountCardSelected]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedReceivingAccountId(Number(method.id))}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.accountCopy}>
                    <Text style={styles.accountTitle}>{method.title}</Text>
                    <Text style={styles.accountSubtitle}>{method.subtitle}</Text>
                    <Text style={styles.accountMeta}>Moneda: {(method.currency ?? 'ARS').toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.declarationRow} activeOpacity={0.85} onPress={() => setAcceptedDeclaration((prev) => !prev)}>
            <View style={[styles.checkbox, acceptedDeclaration && styles.checkboxSelected]}>
              {acceptedDeclaration ? <Feather name="check" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.declarationText}>
              Declaro que soy titular del artículo y que la información enviada es verdadera.
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          activeOpacity={0.9}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Enviando…' : 'Enviar nuevo artículo'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: C.brown,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 14,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: C.text, fontSize: 17, fontWeight: '800' },
  sectionHint: { color: C.muted, fontSize: 13, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoSlot: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FAFBFD',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFF1E8',
    color: C.brown,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    zIndex: 1,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoHint: { color: C.muted, fontSize: 12, marginTop: 8 },
  inputLabel: { color: C.text, fontSize: 14, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: '#FBFCFE',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
  },
  dropdownWrapper: {
    zIndex: 100, 
    elevation: 10,
  },
  dropdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownListAbsolute: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 15,
    color: C.text,
  },
  textarea: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  switchCopy: { flex: 1, gap: 4 },
  switchHint: { color: C.muted, fontSize: 13, lineHeight: 18 },
  choiceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  choiceButton: {
    minWidth: 88,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: '#FBFCFE',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  choiceButtonSelected: {
    borderColor: '#BDA18D',
    backgroundColor: '#FFF8F4',
  },
  choiceButtonText: { color: C.text, fontSize: 14, fontWeight: '700' },
  choiceButtonTextSelected: { color: C.brown },
  artBlock: { gap: 12 },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F2D6BD',
    backgroundColor: '#FFF8F2',
    alignSelf: 'flex-start',
  },
  secondaryActionText: { color: C.brown, fontSize: 14, fontWeight: '700' },
  documentsList: { gap: 8 },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: C.border,
  },
  documentName: { color: C.text, flex: 1 },
  helperText: { color: C.muted, fontSize: 14, lineHeight: 20 },
  accountCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FBFCFE',
  },
  accountCardSelected: {
    borderColor: '#BDA18D',
    backgroundColor: '#FFF8F4',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C5D0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: C.brown },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.brown,
  },
  accountCopy: { flex: 1, gap: 4 },
  accountTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  accountSubtitle: { color: C.muted, fontSize: 13 },
  accountMeta: { color: C.brown, fontSize: 12, fontWeight: '700' },
  declarationRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#C5D0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: { backgroundColor: C.brown, borderColor: C.brown },
  declarationText: { color: C.text, flex: 1, lineHeight: 22, fontSize: 14 },
  primaryButton: {
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: C.brown,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#653728',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
