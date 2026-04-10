import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface Passenger {
  name: string;
  seat?: string;
}

interface Ticket {
  ticket_id: string;
  pnr: string;
  airline: string;
  flight_number: string;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
  departure_date: string;
  departure_time: string;
  passengers: Passenger[];
  status: string;
  booking_class?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  onPress: () => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getPassengerDisplay(passengers: Passenger[]): string {
  if (!passengers || passengers.length === 0) return 'No passengers';
  const names = passengers.map(p => p.name);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'confirmed': return COLORS.brand.success;
    case 'cancelled': return COLORS.brand.accent;
    case 'delayed': return COLORS.brand.warning;
    default: return COLORS.text.tertiary;
  }
}

export default function TicketCard({ ticket, onPress }: TicketCardProps) {
  return (
    <TouchableOpacity
      testID={`ticket-card-${ticket.pnr}`}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.airlineRow}>
          <View style={styles.airlineBadge}>
            <Text style={styles.airlineLetter}>{ticket.airline?.charAt(0) || '?'}</Text>
          </View>
          <View>
            <Text style={styles.airlineName}>{ticket.airline}</Text>
            <Text style={styles.flightNum}>{ticket.flight_number}</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formatDate(ticket.departure_date)}</Text>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(ticket.status) }]} />
        </View>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routePoint}>
          <Text style={styles.airportCode}>{ticket.origin_code}</Text>
          <Text style={styles.cityName} numberOfLines={1}>{ticket.origin_city}</Text>
          {ticket.departure_time ? <Text style={styles.timeText}>{ticket.departure_time}</Text> : null}
        </View>
        <View style={styles.routeLine}>
          <View style={styles.dashedLine} />
          <Ionicons name="airplane" size={20} color={COLORS.brand.primary} />
          <View style={styles.dashedLine} />
        </View>
        <View style={[styles.routePoint, styles.routePointRight]}>
          <Text style={styles.airportCode}>{ticket.destination_code}</Text>
          <Text style={styles.cityName} numberOfLines={1}>{ticket.destination_city}</Text>
        </View>
      </View>

      <View style={styles.separator} />

      <View style={styles.bottomRow}>
        <View style={styles.pnrContainer}>
          <Text style={styles.pnrLabel}>PNR</Text>
          <Text style={styles.pnrValue}>{ticket.pnr}</Text>
        </View>
        <View style={styles.passengersContainer}>
          <Text style={styles.passengersText} numberOfLines={1}>
            {getPassengerDisplay(ticket.passengers)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    ...({ boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' } as any),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  airlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  airlineBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  airlineLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.brand.primary,
  },
  airlineName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  flightNum: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '600',
    marginTop: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  routePoint: {
    flex: 1,
  },
  routePointRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text.primary,
    letterSpacing: 2,
  },
  cityName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
    fontWeight: '600',
  },
  routeLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  separator: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pnrLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 1,
  },
  pnrValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brand.primary,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  passengersContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  passengersText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
});
