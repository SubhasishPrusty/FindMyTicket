import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiCall } from '../../src/api/client';
import { COLORS } from '../../src/constants/theme';

export default function FlightStatusScreen() {
  const [flightNumber, setFlightNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function searchFlight() {
    if (!flightNumber.trim()) {
      setError('Enter a flight number');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await apiCall(`/api/flight-status/${flightNumber.trim().toUpperCase()}`);
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch flight status');
    } finally {
      setLoading(false);
    }
  }

  function getStatusStyle(status: string) {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'landed':
      case 'on time': return { bg: '#ECFDF5', color: COLORS.brand.success, label: status };
      case 'delayed': return { bg: '#FFFBEB', color: COLORS.brand.warning, label: 'Delayed' };
      case 'cancelled': return { bg: '#FEF2F2', color: COLORS.brand.accent, label: 'Cancelled' };
      case 'scheduled': return { bg: '#EFF6FF', color: COLORS.brand.primary, label: 'Scheduled' };
      default: return { bg: COLORS.bg.tertiary, color: COLORS.text.tertiary, label: status || 'Unknown' };
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Flight Status</Text>
          <Text style={styles.subtitle}>Check real-time flight status</Text>

          <View style={styles.searchBox}>
            <View style={styles.inputWrapper}>
              <Ionicons name="search-outline" size={20} color={COLORS.text.tertiary} />
              <TextInput
                testID="flight-status-input"
                style={styles.input}
                placeholder="e.g. AI302, 6E2151"
                placeholderTextColor={COLORS.text.tertiary}
                value={flightNumber}
                onChangeText={setFlightNumber}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={searchFlight}
              />
            </View>
            <TouchableOpacity
              testID="flight-status-search-button"
              style={styles.searchBtn}
              onPress={searchFlight}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={22} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.brand.accent} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {result && result.status === 'api_key_required' && (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={COLORS.brand.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>API Key Required</Text>
                <Text style={styles.infoText}>
                  Add your AviationStack API key to enable live flight tracking. Get a free key at aviationstack.com
                </Text>
              </View>
            </View>
          )}

          {result && result.status === 'not_found' && (
            <View style={styles.infoCard}>
              <Ionicons name="airplane-outline" size={24} color={COLORS.text.tertiary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>No Results</Text>
                <Text style={styles.infoText}>{result.message}</Text>
              </View>
            </View>
          )}

          {result && result.status === 'success' && result.flight && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultAirline}>{result.flight.airline}</Text>
                  <Text style={styles.resultFlight}>{result.flight.flight_number}</Text>
                </View>
                {(() => {
                  const s = getStatusStyle(result.flight.flight_status);
                  return (
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                      <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  );
                })()}
              </View>

              <View style={styles.routeRow}>
                <View style={styles.routePoint}>
                  <Text style={styles.routeCode}>{result.flight.departure?.iata || '---'}</Text>
                  <Text style={styles.routeAirport} numberOfLines={2}>{result.flight.departure?.airport || ''}</Text>
                  {result.flight.departure?.scheduled && (
                    <Text style={styles.routeTime}>{new Date(result.flight.departure.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  )}
                </View>
                <View style={styles.routeArrow}>
                  <Ionicons name="airplane" size={20} color={COLORS.brand.primary} />
                </View>
                <View style={[styles.routePoint, styles.routeRight]}>
                  <Text style={styles.routeCode}>{result.flight.arrival?.iata || '---'}</Text>
                  <Text style={styles.routeAirport} numberOfLines={2}>{result.flight.arrival?.airport || ''}</Text>
                  {result.flight.arrival?.scheduled && (
                    <Text style={styles.routeTime}>{new Date(result.flight.arrival.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  )}
                </View>
              </View>

              {(result.flight.departure?.terminal || result.flight.departure?.gate) && (
                <View style={styles.detailsRow}>
                  {result.flight.departure?.terminal && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>TERMINAL</Text>
                      <Text style={styles.detailValue}>{result.flight.departure.terminal}</Text>
                    </View>
                  )}
                  {result.flight.departure?.gate && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>GATE</Text>
                      <Text style={styles.detailValue}>{result.flight.departure.gate}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4, marginBottom: 24 },
  searchBox: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, height: 52, gap: 10,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.text.primary, fontWeight: '600', letterSpacing: 1 },
  searchBtn: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.brand.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 12, marginBottom: 16, gap: 8,
  },
  errorText: { color: COLORS.brand.accent, fontSize: 13, fontWeight: '600', flex: 1 },
  infoCard: {
    flexDirection: 'row', backgroundColor: COLORS.bg.card, borderRadius: 16,
    padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  infoText: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  resultCard: {
    backgroundColor: COLORS.bg.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
  },
  resultAirline: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  resultFlight: { fontSize: 13, color: COLORS.text.tertiary, fontWeight: '600', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20, gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  routeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  routePoint: { flex: 1 },
  routeRight: { alignItems: 'flex-end' },
  routeCode: { fontSize: 28, fontWeight: '900', color: COLORS.text.primary, letterSpacing: 2 },
  routeAirport: { fontSize: 11, color: COLORS.text.tertiary, marginTop: 2 },
  routeTime: { fontSize: 14, fontWeight: '700', color: COLORS.text.secondary, marginTop: 4 },
  routeArrow: { paddingHorizontal: 12 },
  detailsRow: {
    flexDirection: 'row', gap: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  detailItem: {},
  detailLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text.tertiary, letterSpacing: 1 },
  detailValue: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginTop: 2 },
});
