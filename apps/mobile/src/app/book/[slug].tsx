import { useLocalSearchParams, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api-client';
import { useBookingStore } from '../../store/booking.store';
import { useState } from 'react';

type BookingStep = 'services' | 'datetime' | 'confirm';

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  basePrice: string;
  durationMinutes: number;
}

interface TimeSlot {
  time: string;
}

interface Business {
  businessName: string;
  services: ServiceItem[];
}

function TextInputDate({
  selectedDate,
  onDateChange,
}: {
  selectedDate: string | null;
  onDateChange: (date: string) => void;
}) {
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroller}>
      {dates.map((date) => {
        const dateStr = date.toISOString().split('T')[0];
        const isSelected = selectedDate === dateStr;
        return (
          <TouchableOpacity
            key={dateStr}
            style={[styles.dateChip, isSelected && styles.dateChipSelected]}
            onPress={() => onDateChange(dateStr)}
          >
            <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
              {date.toLocaleDateString(undefined, { weekday: 'short' })}
            </Text>
            <Text style={[styles.dateNum, isSelected && styles.dateNumSelected]}>
              {date.getDate()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [step, setStep] = useState<BookingStep>('services');
  const {
    selectedServiceId,
    selectedDate,
    selectedTimeSlot,
    setService,
    setDate,
    setTimeSlot,
    reset,
  } = useBookingStore();

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', slug],
    queryFn: async () => {
      const { data } = await apiClient.get(`/public-booking/${slug}`);
      return data as Business;
    },
  });

  const { data: availableSlots } = useQuery({
    queryKey: ['availability', selectedServiceId, selectedDate],
    queryFn: async () => {
      const { data } = await apiClient.get(`/public-booking/${slug}/availability`, {
        params: { serviceId: selectedServiceId, date: selectedDate },
      });
      return (data.slots || []) as TimeSlot[];
    },
    enabled: !!selectedServiceId && !!selectedDate,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Business not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            reset();
            router.back();
          }}
        >
          <Text style={styles.closeButton}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.businessName}>{business.businessName}</Text>
        <View style={{ width: 50 }} />
      </View>

      {step === 'services' && (
        <FlatList
          data={business.services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.serviceCard,
                selectedServiceId === item.id && styles.serviceCardSelected,
              ]}
              onPress={() => {
                setService(item.id);
                setStep('datetime');
              }}
            >
              <Text style={styles.serviceTitle}>{item.name}</Text>
              {item.description && <Text style={styles.serviceDesc}>{item.description}</Text>}
              <View style={styles.serviceDetails}>
                <Text style={styles.servicePrice}>${parseFloat(item.basePrice).toFixed(2)}</Text>
                <Text style={styles.serviceDuration}>{item.durationMinutes} min</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {step === 'datetime' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.stepTitle}>Select Date & Time</Text>
          <TextInputDate selectedDate={selectedDate} onDateChange={(date) => setDate(date)} />
          {availableSlots && availableSlots.length > 0 && (
            <View style={styles.slotsContainer}>
              {availableSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.slotChip,
                    selectedTimeSlot === slot.time && styles.slotChipSelected,
                  ]}
                  onPress={() => {
                    setTimeSlot(slot.time);
                    setStep('confirm');
                  }}
                >
                  <Text
                    style={[
                      styles.slotText,
                      selectedTimeSlot === slot.time && styles.slotTextSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setStep('services')}>
            <Text style={styles.backLink}>Back to services</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 'confirm' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.stepTitle}>Confirm Booking</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>
              {business.services?.find((s) => s.id === selectedServiceId)?.name}
            </Text>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{selectedDate}</Text>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{selectedTimeSlot}</Text>
          </View>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={async () => {
              try {
                await apiClient.post(`/public-booking/${slug}/book`, {
                  serviceId: selectedServiceId,
                  date: selectedDate,
                  timeSlot: selectedTimeSlot,
                });
                reset();
                router.back();
              } catch {
                // Handle error
              }
            }}
          >
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('datetime')}>
            <Text style={styles.backLink}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorTitle: { fontSize: 20, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: { color: '#007AFF', fontSize: 16 },
  businessName: { fontSize: 18, fontWeight: '600' },
  listContent: { padding: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceCardSelected: { borderColor: '#000' },
  serviceTitle: { fontSize: 18, fontWeight: '600' },
  serviceDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  serviceDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  servicePrice: { fontSize: 16, fontWeight: '700' },
  serviceDuration: { fontSize: 14, color: '#666' },
  dateScroller: { marginBottom: 16 },
  dateChip: {
    width: 60,
    height: 72,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateChipSelected: { backgroundColor: '#000', borderColor: '#000' },
  dateDay: { fontSize: 12, color: '#666' },
  dateDaySelected: { color: '#fff' },
  dateNum: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  dateNumSelected: { color: '#fff' },
  slotsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  slotChipSelected: { backgroundColor: '#000', borderColor: '#000' },
  slotText: { fontSize: 14, color: '#333' },
  slotTextSelected: { color: '#fff' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryLabel: { fontSize: 12, color: '#999', textTransform: 'uppercase', marginTop: 12 },
  summaryValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  confirmButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { color: '#007AFF', fontSize: 14, marginTop: 16, textAlign: 'center' },
});
