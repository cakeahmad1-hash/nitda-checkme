
// Redefining types locally to ensure API isolation and prevent build errors
// when importing from outside the /api directory.

export enum VisitorStatus {
  IN = 'IN',
  OUT = 'OUT',
  AUTO_CHECKOUT = 'AUTO_CHECKOUT',
  REGISTERED = 'REGISTERED',
  ATTENDED = 'ATTENDED',
}

export enum VisitorType {
  STAFF = 'Staff',
  CORPER = 'Corper',
  SIWES = 'SIWES',
  GUEST = 'Guest',
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
  organization?: string;
  eventId?: string;
  eventName?: string;
  checkIn: number;
  checkOut?: number;
  duration?: string;
  status: VisitorStatus;
  customData?: Record<string, string>;
  context?: 'gate' | 'event' | 'intern';
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'radio';
  options?: string[];
  required: boolean;
}

export interface Event {
  id: string;
  name: string;
  createdAt: number;
  customFields?: FormField[];
}

export const mapLog = (row: any): VisitorLog => ({
    id: row.id,
    visitorId: row.visitor_id,
    name: row.name,
    department: row.department || '',
    organization: row.organization || '',
    laptopName: row.laptop_name || '',
    laptopColor: row.laptop_color || '',
    serialNumber: row.serial_number || '',
    visitorType: row.visitor_type as VisitorType,
    eventId: row.event_id,
    eventName: row.event_name,
    checkIn: Number(row.check_in),
    checkOut: row.check_out ? Number(row.check_out) : undefined,
    duration: row.duration,
    status: row.status as VisitorStatus,
    customData: row.custom_data || {},
    context: row.context || 'gate'
});

export const mapEvent = (row: any): Event => ({
    id: row.id,
    name: row.name,
    createdAt: Number(row.created_at),
    customFields: row.custom_fields || []
});
