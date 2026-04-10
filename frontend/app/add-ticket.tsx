import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { apiCall } from '../src/api/client';
import { COLORS } from '../src/constants/theme';

type Mode = 'choose' | 'manual' | 'parsing' | 'review';

const emptyForm = {
  pnr: '', airline: '', flight_number: '', origin_code: '', origin_city: '',
  destination_code: '', destination_city: '', departure_date: '', departure_time: '',
  arrival_date: '', arrival_time: '', gate: '', terminal: '', seat: '',
  booking_class: 'Economy', passenger_name: '',
};

async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function AddTicketScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [form, setForm] = useState(emptyForm);
  const [passengers, setPassengers] = useState<{ name: string; seat: string }[]>([{ name: '', seat: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  function updateForm(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addPassenger() {
    setPassengers(prev => [...prev, { name: '', seat: '' }]);
  }

  function updatePassenger(index: number, field: string, value: string) {
    setPassengers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function removePassenger(index: number) {
    if (passengers.length <= 1) return;
    setPassengers(prev => prev.filter((_, i) => i !== index));
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (Platform.OS === 'web') { window.alert('Camera access is required'); }
      else { Alert.alert('Permission needed', 'Camera access is required'); }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      await parseImage(result.assets[0].uri, 'image/jpeg');
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (Platform.OS === 'web') { window.alert('Photo library access is required'); }
      else { Alert.alert('Permission needed', 'Photo library access is required'); }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      await parseImage(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime = asset.mimeType || 'application/pdf';
        await parseImage(asset.uri, mime);
      }
    } catch (e: any) {
      setError('Failed to pick document: ' + (e.message || 'Unknown error'));
    }
  }

  async function parseImage(uri: string, mimeType: string) {
    setParsing(true);
    setMode('parsing');
    setError('');
    try {
      const base64 = await readFileAsBase64(uri);
      const data = await apiCall('/api/tickets/parse', {
        method: 'POST',
        body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
      });

      const p = data.parsed_ticket;
      setForm({
        pnr: p.pnr || '', airline: p.airline || '', flight_number: p.flight_number || '',
        origin_code: p.origin_code || '', origin_city: p.origin_city || '',
        destination_code: p.destination_code || '', destination_city: p.destination_city || '',
        departure_date: p.departure_date || '', departure_time: p.departure_time || '',
        arrival_date: p.arrival_date || '', arrival_time: p.arrival_time || '',
        gate: p.gate || '', terminal: p.terminal || '', seat: p.seat || '',
        booking_class: p.booking_class || 'Economy', passenger_name: '',
      });
      if (p.passengers?.length > 0) {
        setPassengers(p.passengers.map((ps: any) => ({ name: ps.name || '', seat: ps.seat || '' })));
      }
      setMode('review');
    } catch (e: any) {
      setError(e.message || 'Failed to parse ticket');
      setMode('choose');
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit() {
    setError('');
    const validPassengers = passengers.filter(p => p.name.trim());
    if (!form.pnr.trim()) { setError('PNR is required'); return; }
    if (!form.airline.trim()) { setError('Airline is required'); return; }
    if (!form.flight_number.trim()) { setError('Flight number is required'); return; }
    if (!form.origin_code.trim()) { setError('Origin airport code is required'); return; }
    if (!form.destination_code.trim()) { setError('Destination airport code is required'); return; }
    if (!form.departure_date.trim()) { setError('Departure date is required'); return; }
    if (validPassengers.length === 0) { setError('At least one passenger is required'); return; }

    setSubmitting(true);
    try {
      await apiCall('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          passengers: validPassengers,
        }),
      });
      router.back();
    } catch (e: any) {
      setError(e.message || 'Failed to save ticket');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="add-ticket-back-button" onPress={() => mode === 'choose' ? router.back() : setMode('choose')} style={styles.backBtn}>
          <Ionicons name={mode === 'choose' ? 'close' : 'arrow-back'} size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'choose' ? 'Add Ticket' : mode === 'manual' ? 'Manual Entry' : mode === 'parsing' ? 'Scanning...' : 'Review Ticket'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {mode === 'choose' && (
          <View style={styles.chooseContainer}>
            <Text style={styles.chooseTitle}>How would you like to add your ticket?</Text>

            <TouchableOpacity testID="upload-camera-button" style={styles.optionCard} onPress={pickFromCamera}>
              <View style={[styles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="camera-outline" size={28} color={COLORS.brand.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionDesc}>Capture your boarding pass or ticket</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity testID="upload-gallery-button" style={styles.optionCard} onPress={pickFromGallery}>
              <View style={[styles.optionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="image-outline" size={28} color={COLORS.brand.success} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>From Gallery</Text>
                <Text style={styles.optionDesc}>Pick a screenshot or saved ticket</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity testID="upload-document-button" style={styles.optionCard} onPress={pickDocument}>
              <View style={[styles.optionIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="document-outline" size={28} color={COLORS.brand.warning} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Upload File</Text>
                <Text style={styles.optionDesc}>PDF or image of your ticket</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity testID="manual-entry-button" style={styles.optionCard} onPress={() => setMode('manual')}>
              <View style={[styles.optionIcon, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="create-outline" size={28} color="#EC4899" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Enter Manually</Text>
                <Text style={styles.optionDesc}>Type in your flight details</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

        {mode === 'parsing' && (
          <View style={styles.parsingContainer}>
            <ActivityIndicator size="large" color={COLORS.brand.primary} />
            <Text style={styles.parsingTitle}>Scanning your ticket...</Text>
            <Text style={styles.parsingSubtitle}>AI is extracting flight information</Text>
          </View>
        )}

        {(mode === 'manual' || mode === 'review') && (
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            {mode === 'review' && (
              <View style={styles.reviewBanner}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.brand.success} />
                <Text style={styles.reviewText}>AI extracted the details below. Please review and edit if needed.</Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.brand.accent} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>FLIGHT INFORMATION</Text>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>PNR *</Text>
                <TextInput testID="form-pnr" style={styles.fieldInput} value={form.pnr}
                  onChangeText={v => updateForm('pnr', v)} placeholder="ABC123" autoCapitalize="characters"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Flight Number *</Text>
                <TextInput testID="form-flight-number" style={styles.fieldInput} value={form.flight_number}
                  onChangeText={v => updateForm('flight_number', v)} placeholder="AI302" autoCapitalize="characters"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Airline *</Text>
            <TextInput testID="form-airline" style={styles.fieldInput} value={form.airline}
              onChangeText={v => updateForm('airline', v)} placeholder="Air India"
              placeholderTextColor={COLORS.text.tertiary} />

            <Text style={styles.sectionLabel}>ROUTE</Text>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>From Code *</Text>
                <TextInput testID="form-origin-code" style={styles.fieldInput} value={form.origin_code}
                  onChangeText={v => updateForm('origin_code', v.toUpperCase())} placeholder="DEL"
                  maxLength={3} autoCapitalize="characters" placeholderTextColor={COLORS.text.tertiary} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>To Code *</Text>
                <TextInput testID="form-dest-code" style={styles.fieldInput} value={form.destination_code}
                  onChangeText={v => updateForm('destination_code', v.toUpperCase())} placeholder="BOM"
                  maxLength={3} autoCapitalize="characters" placeholderTextColor={COLORS.text.tertiary} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>From City</Text>
                <TextInput style={styles.fieldInput} value={form.origin_city}
                  onChangeText={v => updateForm('origin_city', v)} placeholder="New Delhi"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>To City</Text>
                <TextInput style={styles.fieldInput} value={form.destination_city}
                  onChangeText={v => updateForm('destination_city', v)} placeholder="Mumbai"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>DATE & TIME</Text>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Departure Date *</Text>
                <TextInput testID="form-dep-date" style={styles.fieldInput} value={form.departure_date}
                  onChangeText={v => updateForm('departure_date', v)} placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Departure Time</Text>
                <TextInput style={styles.fieldInput} value={form.departure_time}
                  onChangeText={v => updateForm('departure_time', v)} placeholder="08:30"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Arrival Date</Text>
                <TextInput style={styles.fieldInput} value={form.arrival_date}
                  onChangeText={v => updateForm('arrival_date', v)} placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Arrival Time</Text>
                <TextInput style={styles.fieldInput} value={form.arrival_time}
                  onChangeText={v => updateForm('arrival_time', v)} placeholder="10:45"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>ADDITIONAL DETAILS</Text>
            <View style={styles.row}>
              <View style={styles.thirdField}>
                <Text style={styles.fieldLabel}>Gate</Text>
                <TextInput style={styles.fieldInput} value={form.gate}
                  onChangeText={v => updateForm('gate', v)} placeholder="A12"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
              <View style={styles.thirdField}>
                <Text style={styles.fieldLabel}>Terminal</Text>
                <TextInput style={styles.fieldInput} value={form.terminal}
                  onChangeText={v => updateForm('terminal', v)} placeholder="T3"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
              <View style={styles.thirdField}>
                <Text style={styles.fieldLabel}>Seat</Text>
                <TextInput style={styles.fieldInput} value={form.seat}
                  onChangeText={v => updateForm('seat', v)} placeholder="12A"
                  placeholderTextColor={COLORS.text.tertiary} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>PASSENGERS</Text>
            {passengers.map((p, i) => (
              <View key={i} style={styles.passengerRow}>
                <View style={styles.passengerFields}>
                  <TextInput
                    testID={`form-passenger-name-${i}`}
                    style={[styles.fieldInput, styles.flex]}
                    value={p.name}
                    onChangeText={v => updatePassenger(i, 'name', v)}
                    placeholder="Passenger name"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                  <TextInput
                    style={[styles.fieldInput, { width: 70 }]}
                    value={p.seat}
                    onChangeText={v => updatePassenger(i, 'seat', v)}
                    placeholder="Seat"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                </View>
                {passengers.length > 1 && (
                  <TouchableOpacity onPress={() => removePassenger(i)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={22} color={COLORS.brand.accent} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity testID="add-passenger-button" style={styles.addPassengerBtn} onPress={addPassenger}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.brand.primary} />
              <Text style={styles.addPassengerText}>Add Passenger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="save-ticket-button"
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Save Ticket</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text.primary },
  chooseContainer: { paddingHorizontal: 20, paddingTop: 12 },
  chooseTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.secondary, marginBottom: 20 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card,
    borderRadius: 16, padding: 16, marginBottom: 12, gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  optionIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  optionDesc: { fontSize: 12, color: COLORS.text.tertiary, marginTop: 2 },
  parsingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  parsingTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
  parsingSubtitle: { fontSize: 14, color: COLORS.text.secondary },
  formScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5',
    borderRadius: 12, padding: 12, marginBottom: 16, gap: 8,
  },
  reviewText: { fontSize: 13, color: COLORS.brand.success, fontWeight: '600', flex: 1 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 12, marginBottom: 16, gap: 8,
  },
  errorText: { color: COLORS.brand.accent, fontSize: 13, fontWeight: '600', flex: 1 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.text.tertiary,
    letterSpacing: 1.5, marginTop: 16, marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, marginBottom: 10 },
  thirdField: { flex: 1, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text.secondary, marginBottom: 4 },
  fieldInput: {
    backgroundColor: COLORS.bg.card, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, height: 44,
    fontSize: 15, color: COLORS.text.primary, fontWeight: '500',
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  passengerFields: { flex: 1, flexDirection: 'row', gap: 8 },
  removeBtn: { padding: 4 },
  addPassengerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, marginBottom: 8,
  },
  addPassengerText: { fontSize: 14, fontWeight: '600', color: COLORS.brand.primary },
  submitBtn: {
    backgroundColor: COLORS.brand.primary, borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
