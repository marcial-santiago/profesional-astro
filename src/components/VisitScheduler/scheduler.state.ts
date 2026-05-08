// State management for the visit scheduler

export interface WorkType {
  id: number;
  name: string;
  description?: string;
  duration?: number;
}

export interface AppState {
  currentStep: number;
  workTypes: WorkType[];
  selectedWorkType: WorkType | null;
  selectedDate: string | null;
  selectedTime: string | null;
  availableSlots: string[];
  isLoading: boolean;
}

export class SchedulerState {
  private state: AppState = {
    currentStep: 1,
    workTypes: [],
    selectedWorkType: null,
    selectedDate: null,
    selectedTime: null,
    availableSlots: [],
    isLoading: false,
  };

  private listeners: Set<() => void> = new Set();

  getState(): Readonly<AppState> {
    return { ...this.state };
  }

  setState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  reset(): void {
    this.state = {
      currentStep: 1,
      workTypes: this.state.workTypes,
      selectedWorkType: null,
      selectedDate: null,
      selectedTime: null,
      availableSlots: [],
      isLoading: false,
    };
    this.notify();
  }
}
