import { create } from 'zustand';

interface BookingState {
  selectedServiceId: string | null;
  selectedDate: string | null;
  selectedTimeSlot: string | null;
  guestCount: number;
  addons: string[];
  setService: (id: string) => void;
  setDate: (date: string) => void;
  setTimeSlot: (slot: string) => void;
  setGuestCount: (count: number) => void;
  toggleAddon: (id: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedServiceId: null,
  selectedDate: null,
  selectedTimeSlot: null,
  guestCount: 1,
  addons: [],
  setService: (id) => set({ selectedServiceId: id }),
  setDate: (date) => set({ selectedDate: date }),
  setTimeSlot: (slot) => set({ selectedTimeSlot: slot }),
  setGuestCount: (count) => set({ guestCount: count }),
  toggleAddon: (id) =>
    set((state) => ({
      addons: state.addons.includes(id)
        ? state.addons.filter((a) => a !== id)
        : [...state.addons, id],
    })),
  reset: () =>
    set({
      selectedServiceId: null,
      selectedDate: null,
      selectedTimeSlot: null,
      guestCount: 1,
      addons: [],
    }),
}));
