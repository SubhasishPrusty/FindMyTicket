import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { apiCall } from '../../src/api/client';
import { COLORS } from '../../src/constants/theme';
import TicketCard from '../../src/components/TicketCard';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await apiCall('/api/tickets');
      setTickets(data.tickets || []);
    } catch (e) {
      console.error('Failed to fetch tickets:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [fetchTickets])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchTickets();
  }

  const upcomingTickets = tickets.filter(t => {
    const depDate = new Date(t.departure_date + 'T00:00:00');
    return depDate >= new Date(new Date().toDateString());
  });

  const pastTickets = tickets.filter(t => {
    const depDate = new Date(t.departure_date + 'T00:00:00');
    return depDate < new Date(new Date().toDateString());
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Traveller'}</Text>
          <Text style={styles.headerTitle}>My Tickets</Text>
        </View>
        <TouchableOpacity
          testID="header-profile-button"
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="person-circle-outline" size={32} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand.primary} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="airplane-outline" size={48} color={COLORS.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>No tickets yet</Text>
          <Text style={styles.emptySubtitle}>Add your first flight ticket to get started</Text>
          <TouchableOpacity
            testID="empty-add-ticket-button"
            style={styles.emptyBtn}
            onPress={() => router.push('/add-ticket')}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.emptyBtnText}>Add Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          testID="tickets-scroll-view"
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand.primary} />
          }
        >
          {upcomingTickets.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>UPCOMING</Text>
              {upcomingTickets.map(ticket => (
                <TicketCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  onPress={() => router.push(`/ticket/${ticket.ticket_id}`)}
                />
              ))}
            </View>
          )}

          {pastTickets.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>PAST FLIGHTS</Text>
              {pastTickets.map(ticket => (
                <TicketCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  onPress={() => router.push(`/ticket/${ticket.ticket_id}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        testID="fab-add-ticket-button"
        style={styles.fab}
        onPress={() => router.push('/add-ticket')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: COLORS.text.secondary, fontWeight: '500' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text.primary, letterSpacing: -0.5 },
  profileBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    height: 48,
    gap: 8,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
