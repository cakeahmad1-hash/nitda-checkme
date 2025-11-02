export enum VisitorStatus {
  IN = 'IN',
  OUT = 'OUT',
  AUTO_CHECKOUT = 'AUTO_CHECKOUT',
  REGISTERED = 'REGISTERED',
}

export enum VisitorType {
  STAFF = 'Staff',
  CORPER = 'Corper',
  SIWES = 'SIWES',
  GUEST = 'Guest',
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'radio';
  options?: string[];
  required: boolean;
}

export interface VisitorLog {
  id: string;
  visitorId: string;
  name: string;
  department?: string;
  laptopName?: string;
  laptopColor?: string;
  serialNumber?: string;
  visitorType?: VisitorType;
  organization?: string; // Kept for event registrations
  eventId?: string;
  eventName?: string;
  checkIn: number; // timestamp
  checkOut?: number; // timestamp
  duration?: string;
  status: VisitorStatus;
  customData?: Record<string, string>; // { fieldId: value }
}

export interface Event {
  id: string;
  name: string;
  createdAt: number; // timestamp
  customFields?: FormField[];
}

export interface Stats {
  currentlyIn: number;
  totalVisitorsToday: number;
  totalEvents: number;
}
