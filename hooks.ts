import { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import {
  collection, doc, getDocs, setDoc, updateDoc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { VisitorLog, Event, VisitorStatus, Stats, FormField, VisitorType } from './types';

const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const isToday = (timestamp: number) => {
  const today = new Date();
  const date = new Date(timestamp);
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export const useMockDb = () => {
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  // Real-time listener for visitor logs
  useEffect(() => {
    const q = query(collection(db, 'visitorLogs'), orderBy('checkIn', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(d => d.data() as VisitorLog);
      setVisitorLogs(logs);
    });
    return () => unsub();
  }, []);

  // Real-time listener for events
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const evts = snapshot.docs.map(d => d.data() as Event);
      setEvents(evts);
    });
    return () => unsub();
  }, []);

  const getVisitorLogs = useCallback(async () => {
    return [...visitorLogs].sort((a, b) => b.checkIn - a.checkIn);
  }, [visitorLogs]);

  const getEvents = useCallback(async () => {
    return [...events].sort((a, b) => b.createdAt - a.createdAt);
  }, [events]);

  const getEventById = useCallback(async (eventId: string) => {
    return events.find(e => e.id === eventId);
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

  const saveLog = async (log: VisitorLog) => {
    await setDoc(doc(db, 'visitorLogs', log.id), log);
  };

  const consolidateVisitorDetails = (logs: VisitorLog[]) => {
    return logs.reduce((details, log) => ({
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
      visitorType: undefined as VisitorType | undefined,
    });
  };

  const handleVisitorScan = useCallback(async (visitorId: string, eventId?: string, context: 'gate' | 'intern' = 'gate') => {
    if (context === 'intern') {
      const todaysInternLog = visitorLogs.find(log =>
        log.visitorId === visitorId && log.context === 'intern' && isToday(log.checkIn)
      );
      if (todaysInternLog) {
        return { action: 'already_attended', log: todaysInternLog };
      }
      const allLogsForVisitor = visitorLogs.filter(log => log.visitorId === visitorId);
      const consolidatedDetails = consolidateVisitorDetails(allLogsForVisitor);
      const newLog: VisitorLog = {
        id: uuidv4(),
        visitorId,
        ...consolidatedDetails,
        checkIn: Date.now(),
        status: VisitorStatus.ATTENDED,
        context: 'intern',
      };
      await saveLog(newLog);
      return { action: 'attended', log: newLog };
    }

    const contextSpecificLogs = visitorLogs.filter(log =>
      log.visitorId === visitorId && (eventId ? log.eventId === eventId : log.context === context)
    );
    const latestLog = contextSpecificLogs.sort((a, b) => b.checkIn - a.checkIn)[0];
    const eventDetails = eventId ? events.find(e => e.id === eventId) : undefined;

    if (latestLog && latestLog.status === VisitorStatus.IN && isToday(latestLog.checkIn)) {
      const checkOut = Date.now();
      const durationMs = checkOut - latestLog.checkIn;
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const seconds = Math.floor(((durationMs % 3600000) % 60000) / 1000);
      const updatedLog: VisitorLog = {
        ...latestLog,
        checkOut,
        status: VisitorStatus.OUT,
        duration: `${hours}h ${minutes}m ${seconds}s`
      };
      await saveLog(updatedLog);
      return { action: 'checkout', log: updatedLog };
    } else {
      const allLogsForVisitor = visitorLogs.filter(log => log.visitorId === visitorId);
      const consolidatedDetails = consolidateVisitorDetails(allLogsForVisitor);
      const newLog: VisitorLog = {
        id: uuidv4(),
        visitorId,
        ...consolidatedDetails,
        checkIn: Date.now(),
        status: VisitorStatus.IN,
        eventId,
        eventName: eventDetails?.name,
        context: eventId ? 'event' : context,
      };
      await saveLog(newLog);
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
    customData?: Record<string, string>,
    context: 'gate' | 'event' | 'intern' = 'gate'
  ) => {
    const visitorId = existingVisitorId || `visitor-${uuidv4()}`;
    let status: VisitorStatus;
    if (eventId) {
      status = VisitorStatus.REGISTERED;
    } else if (context === 'intern') {
      status = VisitorStatus.ATTENDED;
    } else {
      status = VisitorStatus.IN;
    }
    const event = eventId ? events.find(e => e.id === eventId) : undefined;
    const newLog: VisitorLog = {
      id: uuidv4(),
      visitorId,
      name: data.name,
      organization: data.organization,
      department: context === 'gate' ? data.department : undefined,
      laptopName: context === 'gate' ? data.laptopName : undefined,
      laptopColor: context === 'gate' ? data.laptopColor : undefined,
      serialNumber: context === 'gate' ? data.serialNumber : undefined,
      visitorType: (context === 'gate' || context === 'intern') ? data.visitorType : undefined,
      checkIn: Date.now(),
      status,
      customData: eventId ? customData : undefined,
      context: eventId ? 'event' : context,
      eventId,
      eventName: event?.name,
    };
    await saveLog(newLog);
    return { ...newLog };
  }, [events]);

  const createEvent = useCallback(async (eventName: string, customFields?: FormField[]) => {
    const newEvent: Event = {
      id: `event-${uuidv4()}`,
      name: eventName,
      createdAt: Date.now(),
      customFields: customFields?.length ? customFields : undefined,
    };
    await setDoc(doc(db, 'events', newEvent.id), newEvent);
    return newEvent;
  }, []);

  const getLatestLogForVisitor = useCallback(async (visitorId: string) => {
    const allLogsForVisitor = visitorLogs.filter(log => log.visitorId === visitorId);
    if (!allLogsForVisitor.length) return null;
    return consolidateVisitorDetails(allLogsForVisitor);
  }, [visitorLogs]);

  const hasVisitorRegisteredForEvent = useCallback(async (visitorId: string, eventId: string) => {
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
      checkIn: number;
      checkOut?: number;
    }
  ) => {
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
      context: 'gate',
    };
    await saveLog(newLog);
    return newLog;
  }, []);

  const updateVisitorLog = useCallback(async (
    logId: string,
    data: {
      name: string;
      department: string;
      laptopName?: string;
      laptopColor?: string;
      serialNumber?: string;
      visitorType: VisitorType;
    }
  ) => {
    const targetLog = visitorLogs.find(l => l.id === logId);
    if (!targetLog) return;
    const targetVisitorId = targetLog.visitorId;
    const logsToUpdate = visitorLogs.filter(log => log.visitorId === targetVisitorId);
    for (const log of logsToUpdate) {
      await updateDoc(doc(db, 'visitorLogs', log.id), { ...data });
    }
  }, [visitorLogs]);

  return {
    getVisitorLogs, handleVisitorScan, registerNewVisitor, createEvent,
    getEvents, getStats, getEventById, getLatestLogForVisitor,
    hasVisitorRegisteredForEvent, addManualVisitorLog, updateVisitorLog
  };
};
