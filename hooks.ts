import { useState, useEffect, useCallback } from 'react';
import { VisitorLog, Event, VisitorStatus, Stats, FormField, VisitorType } from './types';
// FIX: Removed incorrect import of uuidv4 from a non-existent package.
// import { v4 as uuidv4 } from 'uuid';

// Helper to check if a timestamp is from today
const isToday = (timestamp: number) => {
  const today = new Date();
  const date = new Date(timestamp);
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

export const useMockDb = () => {
  // FIX: Persist data in localStorage to simulate a database and share state between admin and visitor flows.
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>(() => {
    try {
        const saved = localStorage.getItem('nitda_visitorLogs');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to parse visitorLogs from localStorage", e);
        return [];
    }
  });
  const [events, setEvents] = useState<Event[]>(() => {
     try {
        const saved = localStorage.getItem('nitda_events');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to parse events from localStorage", e);
        return [];
    }
  });

  // Save to localStorage whenever data changes.
  useEffect(() => {
    localStorage.setItem('nitda_visitorLogs', JSON.stringify(visitorLogs));
  }, [visitorLogs]);

  useEffect(() => {
    localStorage.setItem('nitda_events', JSON.stringify(events));
  }, [events]);

  // FIX: Add a listener for storage events to synchronize state across browser tabs.
  // This ensures that if an admin creates an event in one tab, a guest in another tab
  // will receive the updated event list.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nitda_events' && e.newValue) {
        try {
          setEvents(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Failed to parse events from storage event", err);
        }
      }
      if (e.key === 'nitda_visitorLogs' && e.newValue) {
        try {
          setVisitorLogs(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Failed to parse visitorLogs from storage event", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  // Simulate daily auto-reset by filtering out old "IN" logs on load.
  // In a real app, a backend cron job would handle this.
  useEffect(() => {
    setVisitorLogs(logs => logs.map(log => {
      if (log.status === VisitorStatus.IN && !isToday(log.checkIn)) {
        return { 
            ...log, 
            status: VisitorStatus.AUTO_CHECKOUT,
            checkOut: new Date(log.checkIn).setHours(23, 59, 59, 999),
            duration: "Auto-cleared at day end"
        };
      }
      return log;
    }));
  }, []);

  const getVisitorLogs = useCallback(async () => {
    await new Promise(res => setTimeout(res, 300));
    return [...visitorLogs].sort((a, b) => b.checkIn - a.checkIn);
  }, [visitorLogs]);

  const handleVisitorScan = useCallback(async (visitorId: string, eventId?: string) => {
    await new Promise(res => setTimeout(res, 500));
    
    // Filter logs based on the context (gate or specific event)
    const contextSpecificLogs = visitorLogs.filter(log => 
        log.visitorId === visitorId && log.eventId === eventId
    );

    const latestLog = contextSpecificLogs.sort((a, b) => b.checkIn - a.checkIn)[0];
    let resultLog: VisitorLog | undefined;
    
    const eventDetails = eventId ? events.find(e => e.id === eventId) : undefined;

    if (latestLog && latestLog.status === VisitorStatus.IN && isToday(latestLog.checkIn)) {
      // Check out from this specific context (gate or event)
      setVisitorLogs(logs => logs.map(log => {
        if (log.id === latestLog.id) {
          const checkOut = Date.now();
          const durationMs = checkOut - log.checkIn;
          const hours = Math.floor(durationMs / 3600000);
          const minutes = Math.floor((durationMs % 3600000) / 60000);
          const seconds = Math.floor(((durationMs % 3600000) % 60000) / 1000);
          resultLog = {
            ...log,
            checkOut,
            status: VisitorStatus.OUT,
            duration: `${hours}h ${minutes}m ${seconds}s`
          };
          return resultLog;
        }
        return log;
      }));
      return { action: 'checkout', log: resultLog || latestLog };
    } else {
      // Check in to this specific context (gate or event)
      // Consolidate details from ALL previous logs to build a complete profile, regardless of context.
      const allLogsForVisitor = visitorLogs.filter(log => log.visitorId === visitorId);
      const consolidatedDetails = allLogsForVisitor.reduce((details, log) => ({
          name: log.name && log.name !== 'Unknown' ? log.name : details.name,
          organization: log.organization || details.organization,
          department: log.department || details.department,
          laptopName: log.laptopName || details.laptopName,
          laptopColor: log.laptopColor || details.laptopColor,
          serialNumber: log.serialNumber || details.serialNumber,
          visitorType: log.visitorType || details.visitorType,
      }), { 
          name: 'Unknown', 
          organization: '',
          department: '',
          laptopName: '',
          laptopColor: '',
          serialNumber: '',
          visitorType: undefined,
      });

      const newLog: VisitorLog = {
        id: uuidv4(),
        visitorId,
        ...consolidatedDetails,
        checkIn: Date.now(),
        status: VisitorStatus.IN,
        eventId: eventId, // Can be undefined for gate
        eventName: eventDetails?.name, // Can be undefined for gate
      };
      
      setVisitorLogs(logs => [...logs, newLog]);
      return { action: 'checkin', log: newLog };
    }
  }, [visitorLogs, events]);
  
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
    customData?: Record<string, string>
  ) => {
    await new Promise(res => setTimeout(res, 500));
    const visitorId = existingVisitorId || `visitor-${uuidv4()}`; // Use existing or create new
    
    const newLog: VisitorLog = {
        id: uuidv4(),
        visitorId,
        name: data.name,
        organization: data.organization,
        // Only add gate-specific fields if it's a gate registration
        department: eventId ? undefined : data.department,
        laptopName: eventId ? undefined : data.laptopName,
        laptopColor: eventId ? undefined : data.laptopColor,
        serialNumber: eventId ? undefined : data.serialNumber,
        visitorType: eventId ? undefined : data.visitorType,
        checkIn: Date.now(),
        status: eventId ? VisitorStatus.REGISTERED : VisitorStatus.IN,
        customData: eventId ? customData : undefined,
    };

    if (eventId) {
        const event = events.find(e => e.id === eventId);
        newLog.eventId = eventId;
        newLog.eventName = event?.name;
    }

    setVisitorLogs(logs => [...logs, newLog]);
    return { ...newLog };
  }, [events]);

  const createEvent = useCallback(async (eventName: string, customFields?: FormField[]) => {
    await new Promise(res => setTimeout(res, 300));
    const newEvent: Event = {
      id: `event-${uuidv4()}`,
      name: eventName,
      createdAt: Date.now(),
      customFields: customFields?.length ? customFields : undefined,
    };
    setEvents(e => [...e, newEvent]);
    return newEvent;
  }, []);
  
  const getEvents = useCallback(async () => {
    await new Promise(res => setTimeout(res, 200));
    return [...events].sort((a,b) => b.createdAt - a.createdAt);
  }, [events]);
  
  const getStats = useCallback(async (): Promise<Stats> => {
    const todayLogs = visitorLogs.filter(log => isToday(log.checkIn));
    const uniqueVisitorsToday = new Set(todayLogs.map(log => log.visitorId));
    
    return {
      currentlyIn: visitorLogs.filter(log => log.status === VisitorStatus.IN).length,
      totalVisitorsToday: uniqueVisitorsToday.size,
      totalEvents: events.length,
    };
  }, [visitorLogs, events]);
  
  const getEventById = useCallback(async (eventId: string) => {
    return events.find(e => e.id === eventId);
  }, [events]);

  const getLatestLogForVisitor = useCallback(async (visitorId: string) => {
    await new Promise(res => setTimeout(res, 100)); // simulate async
    const allLogsForVisitor = visitorLogs.filter(log => log.visitorId === visitorId);
    if (!allLogsForVisitor.length) return null;

    // Consolidate details to get the most complete profile
    const consolidatedDetails = allLogsForVisitor.reduce((details, log) => ({
        name: log.name && log.name !== 'Unknown' ? log.name : details.name,
        organization: log.organization || details.organization,
        department: log.department || details.department,
        laptopName: log.laptopName || details.laptopName,
        laptopColor: log.laptopColor || details.laptopColor,
        serialNumber: log.serialNumber || details.serialNumber,
        visitorType: log.visitorType || details.visitorType,
    }), { 
        name: 'Unknown', 
        organization: '',
        department: '',
        laptopName: '',
        laptopColor: '',
        serialNumber: '',
        visitorType: undefined,
     });
    
    return consolidatedDetails;
  }, [visitorLogs]);

  const hasVisitorRegisteredForEvent = useCallback(async (visitorId: string, eventId: string) => {
    await new Promise(res => setTimeout(res, 100)); // simulate async
    return visitorLogs.some(log => log.visitorId === visitorId && log.eventId === eventId);
  }, [visitorLogs]);

  const addManualVisitorLog = useCallback(async (
    data: {
        name: string;
        department: string;
        laptopName?: string;
        laptopColor?: string;
        serialNumber?: string;
        visitorType: VisitorType;
        checkIn: number; // timestamp
        checkOut?: number; // timestamp
    }
  ) => {
    await new Promise(res => setTimeout(res, 500));
    
    let duration: string | undefined;
    if (data.checkOut && data.checkOut > data.checkIn) {
        const durationMs = data.checkOut - data.checkIn;
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const seconds = Math.floor(((durationMs % 3600000) % 60000) / 1000);
        duration = `${hours}h ${minutes}m ${seconds}s`;
    }
    
    const newLog: VisitorLog = {
        id: uuidv4(),
        visitorId: `visitor-manual-${uuidv4()}`,
        name: data.name,
        department: data.department,
        laptopName: data.laptopName,
        laptopColor: data.laptopColor,
        serialNumber: data.serialNumber,
        visitorType: data.visitorType,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        duration,
        status: data.checkOut ? VisitorStatus.OUT : VisitorStatus.IN,
    };
    
    setVisitorLogs(logs => [...logs, newLog]);
    return newLog;
  }, []);

  return { getVisitorLogs, handleVisitorScan, registerNewVisitor, createEvent, getEvents, getStats, getEventById, getLatestLogForVisitor, hasVisitorRegisteredForEvent, addManualVisitorLog };
};

// Dummy uuidv4 to avoid adding a dependency for the user.
// In a real project, you would `npm install uuid`.
// FIX: Renamed v4 to uuidv4 to match the function calls within this hook.
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
