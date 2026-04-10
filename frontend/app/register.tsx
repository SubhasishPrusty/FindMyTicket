import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';

export default function RegisterScreen() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [loading, user]);

  if (loading || user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brand.primary} />
      </View>
    );
  }

  async function handleRegister() {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!phone || phone.length < 10) { setError('Enter a valid phone number'); return; }
    if (!pin || pin.length !== 6) { setError('PIN must be exactly 6 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }

    setSubmitting(true);
    try {
      await register(name.trim(), phone, pin);
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity testID="register-back-button" onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Track all your flights in one place</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.brand.accent} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.text.tertiary} />
                <TextInput
                  testID="register-name-input"
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={COLORS.text.tertiary} />
                <TextInput
                  testID="register-phone-input"
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={15}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CREATE 6-DIGIT PIN</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.tertiary} />
                <TextInput
                  testID="register-pin-input"
                  style={styles.input}
                  placeholder="Create a 6-digit PIN"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="number-pad"
                  secureTextEntry
                  value={pin}
                  onChangeText={setPin}
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PIN</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.text.tertiary} />
                <TextInput
                  testID="register-confirm-pin-input"
                  style={styles.input}
                  placeholder="Confirm your PIN"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="number-pad"
                  secureTextEntry
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  maxLength={6}
                />
              </View>
            </View>

            <TouchableOpacity
              testID="register-submit-button"
              style={[styles.registerBtn, submitting && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="go-to-login-button"
              style={styles.loginLink}
              onPress={() => router.back()}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg.primary },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  header: { paddingTop: 8, paddingBottom: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  titleSection: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.text.secondary, marginTop: 4 },
  form: {},
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 12, marginBottom: 16, gap: 8,
  },
  errorText: { color: COLORS.brand.accent, fontSize: 13, fontWeight: '600', flex: 1 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text.tertiary, letterSpacing: 1, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, height: 52, gap: 10,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.text.primary, fontWeight: '500' },
  registerBtn: {
    backgroundColor: COLORS.brand.primary, borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: COLORS.text.secondary },
  loginLinkBold: { color: COLORS.brand.primary, fontWeight: '700' },
});
