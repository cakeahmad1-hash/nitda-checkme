import { createClient } from '@vercel/postgres';

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
  context: row.context || 'gate',
});

export const mapEvent = (row: any): Event => ({
  id: row.id,
  name: row.name,
  createdAt: Number(row.created_at),
  customFields: row.custom_fields || [],
});

/**
 * Creates a DB client using NEON DATABASE_URL safely.
 * Fixes serverless crashes caused by "channel_binding=require".
 */
export const createDbClient = () => {
  const url = process.env.POSTGRES_URL;

  if (!url) {
    throw new Error("❌ POSTGRES_URL is missing. Add it in Vercel → Environment Variables.");
  }

  // Remove the channel_binding parameter if Neon includes it
  const sanitizedUrl = url.replace(/(\?|&)channel_binding=require/g, "");

  return createClient({ connectionString: sanitizedUrl });
};
