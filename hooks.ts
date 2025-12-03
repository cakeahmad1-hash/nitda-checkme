
import { useState, useCallback } from 'react';
import { VisitorLog, Event, VisitorStatus, Stats, FormField, VisitorType } from './types';

// Helper to check if a timestamp is from today
const isToday = (timestamp: number) => {
  const today = new Date();
  const date = new Date(timestamp);
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

// UUID helper kept for client-side generation if needed, though DB handles IDs mostly.
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const useMockDb = () => {
  // We keep the name useMockDb for compatibility, but it now calls the API.

  const getVisitorLogs = useCallback(async (): Promise<VisitorLog[]> => {
    try {
        const res = await fetch('/api/visitors');
        if (!res.ok) {
            console.warn('Visitor logs fetch failed, possibly due to missing DB setup.');
            return [];
        }
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
  }, []);

  const handleVisitorScan = useCallback(async (visitorId: string, eventId?: string, context: 'gate' | 'intern' = 'gate') => {
    try {
        const res = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId, eventId, context })
        });
        if (!res.ok) throw new Error('Scan failed. Ensure database is set up.');
        return await res.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
  }, []);
  
  const registerNewVisitor = useCallback(async (
    data: { 
        name: string; 
        organization?: string;
        department?: string;
        laptopName?: string;
        laptopColor?: string;
        serialNumber?: string;
        visitorType?: VisitorType;
    }, 
    eventId?: string, 
    existingVisitorId?: string | null,
    customData?: Record<string, string>,
    context: 'gate' | 'event' | 'intern' = 'gate'
  ) => {
    const visitorId = existingVisitorId || `visitor-${uuidv4()}`;
    
    // Determine status based on context
    let status: VisitorStatus;
    if (eventId) {
        status = VisitorStatus.REGISTERED;
    } else if (context === 'intern') {
        status = VisitorStatus.ATTENDED;
    } else {
        status = VisitorStatus.IN;
    }

    const payload = {
        visitorId,
        ...data,
        checkIn: Date.now(),
        status,
        eventId,
        eventName: '', // Will be handled by logic or optional
        customData: eventId ? customData : undefined,
        context: eventId ? 'event' : context,
    };

    const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Registration failed. Ensure database is set up.');
    return await res.json();
  }, []);

  const createEvent = useCallback(async (eventName: string, customFields?: FormField[]) => {
    const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: eventName, customFields })
    });
    if (!res.ok) throw new Error('Failed to create event');
    return await res.json();
  }, []);
  
  const getEvents = useCallback(async () => {
    try {
        const res = await fetch('/api/events');
        if (!res.ok) {
             console.warn('Events fetch failed, possibly due to missing DB setup.');
             return [];
        }
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
  }, []);
  
  const getStats = useCallback(async (): Promise<Stats> => {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) {
            console.warn('Stats fetch failed, possibly due to missing DB setup.');
            return { currentlyIn: 0, totalVisitorsToday: 0, totalEvents: 0 };
        }
        return await res.json();
    } catch (e) {
        console.error(e);
        return { currentlyIn: 0, totalVisitorsToday: 0, totalEvents: 0 };
    }
  }, []);
  
  const getEventById = useCallback(async (eventId: string) => {
    try {
        const res = await fetch(`/api/events?id=${eventId}`);
        if (!res.ok) return undefined;
        return await res.json();
    } catch (e) {
        return undefined;
    }
  }, []);

  const getLatestLogForVisitor = useCallback(async (visitorId: string) => {
    try {
        const logs = await getVisitorLogs(); 
        const visitorLogs = logs.filter(l => l.visitorId === visitorId);
        if (!visitorLogs.length) return null;
        
        // Basic consolidation
        const valid = (val: any) => val && val !== 'Unknown';
        return visitorLogs.reduce((details, log) => ({
             name: valid(log.name) ? log.name : details.name,
             organization: log.organization || details.organization,
             department: log.department || details.department,
             laptopName: log.laptopName || details.laptopName,
             laptopColor: log.laptopColor || details.laptopColor,
             serialNumber: log.serialNumber || details.serialNumber,
             visitorType: log.visitorType || details.visitorType,
        }), { 
             name: 'Unknown', organization: '', department: '', laptopName: '', 
             laptopColor: '', serialNumber: '', visitorType: undefined 
        } as any);

    } catch (e) {
        return null;
    }
  }, [getVisitorLogs]);

  const hasVisitorRegisteredForEvent = useCallback(async (visitorId: string, eventId: string) => {
     const logs = await getVisitorLogs();
     return logs.some(log => log.visitorId === visitorId && log.eventId === eventId);
  }, [getVisitorLogs]);

  const addManualVisitorLog = useCallback(async (data: any) => {
    const payload = {
        ...data,
        visitorId: `visitor-manual-${uuidv4()}`,
        status: data.checkOut ? VisitorStatus.OUT : VisitorStatus.IN,
        context: 'gate',
        // Calculate duration if checkOut exists
        duration: data.checkOut ? (() => {
            const diff = data.checkOut - data.checkIn;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            return `${h}h ${m}m`;
        })() : undefined
    };

    const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to add log');
    return await res.json();
  }, []);

  const updateVisitorLog = useCallback(async (logId: string, data: any) => {
    const res = await fetch('/api/visitors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId, ...data })
    });
    if (!res.ok) throw new Error('Failed to update log');
  }, []);

  return { getVisitorLogs, handleVisitorScan, registerNewVisitor, createEvent, getEvents, getStats, getEventById, getLatestLogForVisitor, hasVisitorRegisteredForEvent, addManualVisitorLog, updateVisitorLog };
};
