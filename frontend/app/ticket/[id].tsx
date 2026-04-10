import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiCall } from '../../src/api/client';
import { COLORS, AIRLINE_CHECKIN } from '../../src/constants/theme';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function getStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'confirmed': return { bg: '#ECFDF5', color: COLORS.brand.success };
    case 'cancelled': return { bg: '#FEF2F2', color: COLORS.brand.accent };
    case 'delayed': return { bg: '#FFFBEB', color: COLORS.brand.warning };
    default: return { bg: COLORS.bg.tertiary, color: COLORS.text.tertiary };
  }
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  async function fetchTicket() {
    try {
      const data = await apiCall(`/api/tickets/${id}`);
      setTicket(data.ticket);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load ticket');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!ticket) return;
    const passengers = ticket.passengers?.map((p: any) => p.name).join(', ') || '';
    const message = `✈️ ${ticket.airline} ${ticket.flight_number}\n${ticket.origin_code} → ${ticket.destination_code}\n📅 ${formatDate(ticket.departure_date)} ${ticket.departure_time ? 'at ' + ticket.departure_time : ''}\n🎫 PNR: ${ticket.pnr}\n👥 ${passengers}\n\nI'm using Find My Tickets to track my flights. Try it out: https://findmytickets.app/invite`;
    try {
      await Share.share({ message, title: `${ticket.airline} ${ticket.flight_number}` });
    } catch {}
  }

  async function handleWebCheckin() {
    if (!ticket) return;
    const url = AIRLINE_CHECKIN[ticket.airline] || `https://www.google.com/search?q=${encodeURIComponent(ticket.airline + ' web check in')}`;
    Linking.openURL(url);
  }

  async function handleDelete() {
    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiCall(`/api/tickets/${id}`, { method: 'DELETE' });
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!ticket) return null;

  const statusStyle = getStatusStyle(ticket.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="ticket-back-button" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket Details</Text>
        <TouchableOpacity testID="ticket-share-header-button" onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={COLORS.brand.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.ticketCard}>
          <View style={styles.cardTop}>
            <View style={styles.airlineRow}>
              <View style={styles.airlineBadge}>
                <Text style={styles.airlineLetter}>{ticket.airline?.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.airlineName}>{ticket.airline}</Text>
                <Text style={styles.flightNumber}>{ticket.flight_number}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {ticket.status?.charAt(0).toUpperCase() + ticket.status?.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.routeSection}>
            <View style={styles.routePoint}>
              <Text style={styles.airportCode}>{ticket.origin_code}</Text>
              <Text style={styles.cityName}>{ticket.origin_city}</Text>
              {ticket.departure_time ? <Text style={styles.timeText}>{ticket.departure_time}</Text> : null}
              <Text style={styles.dateSmall}>{formatDate(ticket.departure_date)}</Text>
            </View>
            <View style={styles.routeLine}>
              <View style={styles.dash} />
              <Ionicons name="airplane" size={24} color={COLORS.brand.primary} />
              <View style={styles.dash} />
            </View>
            <View style={[styles.routePoint, styles.routeRight]}>
              <Text style={styles.airportCode}>{ticket.destination_code}</Text>
              <Text style={styles.cityName}>{ticket.destination_city}</Text>
              {ticket.arrival_time ? <Text style={styles.timeText}>{ticket.arrival_time}</Text> : null}
              {ticket.arrival_date ? <Text style={styles.dateSmall}>{formatDate(ticket.arrival_date)}</Text> : null}
            </View>
          </View>

          {(ticket.gate || ticket.terminal || ticket.seat) && (
            <View style={styles.detailsRow}>
              {ticket.gate ? (
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>GATE</Text>
                  <Text style={styles.detailValue}>{ticket.gate}</Text>
                </View>
              ) : null}
              {ticket.terminal ? (
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>TERMINAL</Text>
                  <Text style={styles.detailValue}>{ticket.terminal}</Text>
                </View>
              ) : null}
              {ticket.seat ? (
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>SEAT</Text>
                  <Text style={styles.detailValue}>{ticket.seat}</Text>
                </View>
              ) : null}
              {ticket.booking_class ? (
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>CLASS</Text>
                  <Text style={styles.detailValue}>{ticket.booking_class}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.separator} />

          <View style={styles.pnrSection}>
            <Text style={styles.pnrLabel}>PNR / BOOKING REFERENCE</Text>
            <Text style={styles.pnrCode}>{ticket.pnr}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.passengersSection}>
            <Text style={styles.passengersLabel}>PASSENGERS ({ticket.passengers?.length || 0})</Text>
            {ticket.passengers?.map((p: any, i: number) => (
              <View key={i} style={styles.passengerRow}>
                <View style={styles.passengerNum}>
                  <Text style={styles.passengerNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.passengerName}>{p.name}</Text>
                {p.seat ? <Text style={styles.passengerSeat}>{p.seat}</Text> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity testID="ticket-share-button" style={styles.actionBtn} onPress={handleShare}>
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="share-social-outline" size={22} color={COLORS.brand.primary} />
            </View>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="ticket-checkin-button" style={styles.actionBtn} onPress={handleWebCheckin}>
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="globe-outline" size={22} color={COLORS.brand.success} />
            </View>
            <Text style={styles.actionText}>Web Check-in</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="ticket-status-button" style={styles.actionBtn} onPress={() => router.push(`/(tabs)/status`)}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="airplane-outline" size={22} color={COLORS.brand.warning} />
            </View>
            <Text style={styles.actionText}>Flight Status</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="ticket-delete-button" style={styles.actionBtn} onPress={handleDelete}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="trash-outline" size={22} color={COLORS.brand.accent} />
            </View>
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text.primary },
  shareBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  ticketCard: {
    backgroundColor: COLORS.bg.card, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24,
  },
  airlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  airlineBadge: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center', alignItems: 'center',
  },
  airlineLetter: { fontSize: 18, fontWeight: '800', color: COLORS.brand.primary },
  airlineName: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  flightNumber: { fontSize: 13, color: COLORS.text.tertiary, fontWeight: '600', marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 16, gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  routeSection: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20,
  },
  routePoint: { flex: 1 },
  routeRight: { alignItems: 'flex-end' },
  airportCode: { fontSize: 32, fontWeight: '900', color: COLORS.text.primary, letterSpacing: 2 },
  cityName: { fontSize: 13, color: COLORS.text.tertiary, marginTop: 2, fontWeight: '500' },
  timeText: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary, marginTop: 6 },
  dateSmall: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2, fontWeight: '500' },
  routeLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingHorizontal: 4, paddingTop: 8, gap: 4,
  },
  dash: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  detailsRow: {
    flexDirection: 'row', gap: 0, marginBottom: 20,
  },
  detailBox: {
    flex: 1, backgroundColor: COLORS.bg.tertiary, borderRadius: 12, padding: 12, marginHorizontal: 3,
    alignItems: 'center',
  },
  detailLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text.tertiary, letterSpacing: 1 },
  detailValue: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary, marginTop: 4 },
  separator: {
    height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border, marginVertical: 16,
  },
  pnrSection: { alignItems: 'center', paddingVertical: 4 },
  pnrLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text.tertiary, letterSpacing: 1, marginBottom: 6 },
  pnrCode: {
    fontSize: 28, fontWeight: '900', color: COLORS.brand.primary,
    fontFamily: 'monospace', letterSpacing: 4,
  },
  passengersSection: { paddingTop: 4 },
  passengersLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text.tertiary, letterSpacing: 1, marginBottom: 12 },
  passengerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.bg.tertiary, gap: 10,
  },
  passengerNum: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center', alignItems: 'center',
  },
  passengerNumText: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary },
  passengerName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  passengerSeat: { fontSize: 13, fontWeight: '700', color: COLORS.brand.primary },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  actionBtn: {
    width: '47%', backgroundColor: COLORS.bg.card, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
});
