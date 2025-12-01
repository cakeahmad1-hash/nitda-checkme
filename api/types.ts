import { VisitorLog, Event } from '../types';

// Map database row (snake_case) to application type (camelCase)
export const mapLog = (row: any): VisitorLog => ({
    id: row.id,
    visitorId: row.visitor_id,
    name: row.name,
    department: row.department,
    organization: row.organization,
    laptopName: row.laptop_name,
    laptopColor: row.laptop_color,
    serialNumber: row.serial_number,
    visitorType: row.visitor_type,
    eventId: row.event_id,
    eventName: row.event_name,
    checkIn: Number(row.check_in),
    checkOut: row.check_out ? Number(row.check_out) : undefined,
    duration: row.duration,
    status: row.status,
    customData: row.custom_data,
    context: row.context || 'gate'
});

export const mapEvent = (row: any): Event => ({
    id: row.id,
    name: row.name,
    createdAt: Number(row.created_at),
    customFields: row.custom_fields
});
