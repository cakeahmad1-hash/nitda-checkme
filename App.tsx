import React, { useState, useEffect, useCallback, useRef } from 'react';
// FIX: Import `Navigate` from `react-router-dom` to use the official component.
import { Routes, Route, useNavigate, useLocation, useParams, Link, Navigate } from 'react-router-dom';
import { useMockDb } from './hooks';
import { Event, VisitorLog, VisitorStatus, Stats, FormField, VisitorType } from './types';
import { AdminIcon, ArrowRightIcon, PlusIcon, QrCodeIcon, RefreshIcon, UserIcon, LoginIcon, LogoutIcon, TrashIcon, DownloadIcon, SearchIcon } from './components/icons';

declare global {
    interface Window {
        jsQR: any;
        XLSX: any;
    }
}

const APP_TITLE = "NITDA CheckMe";
const VISITOR_ID_KEY = 'nitda_visitor_id';
const ADMIN_AUTH_KEY = 'nitda_admin_auth';

// Define a type for the DB object for better type-safety
type MockDb = ReturnType<typeof useMockDb>;

// --- Helper Functions ---
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const downloadXLSX = (data: Record<string, any>[], filename: string) => {
  if (!data || data.length === 0) {
    return;
  }

  if (typeof window.XLSX === 'undefined') {
    console.error("SheetJS library not found on window.XLSX");
    alert("Error: Could not export to Excel. The required library is missing.");
    return;
  }

  const worksheet = window.XLSX.utils.json_to_sheet(data);
  
  // Auto-fit columns for better readability
  const headers = Object.keys(data[0]);
  const colWidths = headers.map(header => ({
    wch: Math.max(
      header.length,
      ...data.map(row => (row[header] ? String(row[header]).length : 0))
    ) + 2 // Add a little padding
  }));
  worksheet["!cols"] = colWidths;
  
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  window.XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// --- Reusable UI Components ---

const Header: React.FC<{}> = ({}) => (
  <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40 shadow-lg shadow-black/20">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <Link to="/" className="text-2xl font-bold text-emerald-400 tracking-wider">
          {APP_TITLE}
        </Link>
        <span className="text-sm text-gray-400">Smart Visitor Management</span>
      </div>
    </div>
  </header>
);

const Toast: React.FC<{ message: string; show: boolean; }> = ({ message, show }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 bg-gray-800 border border-emerald-500 text-white py-3 px-5 rounded-lg shadow-lg z-50 flex items-center animate-fade-in-out">
        <svg className="w-6 h-6 text-emerald-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{message}</span>
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; size?: 'md' | 'lg' | 'xl' }> = ({ isOpen, onClose, children, title, size = 'md' }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl'
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={`bg-gray-800 rounded-xl shadow-2xl w-full ${sizeClasses[size]} relative`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div className="p-6">
            {children}
        </div>
      </div>
    </div>
  );
};

const Spinner: React.FC<{}> = ({}) => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
);

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-gray-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden ${className}`}>
        {children}
    </div>
);

// FIX: Simplified the onClick prop type to `() => void` as none of the handlers in the app use the event argument. This resolves potential type conflicts and makes the component's API clearer.
const Button: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; type?: 'button' | 'submit' | 'reset'; disabled?: boolean }> = ({ onClick, children, className = '', type = 'button', disabled = false }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);

const Input: React.FC<{ id: string; name: string; type?: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }> = (props) => (
    <input
        {...props}
        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
    />
);

// --- Page & Flow Components ---

const HomePortal: React.FC<{}> = ({}) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">Welcome to {APP_TITLE}</h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">Your seamless solution for visitor and event attendance management. Please select your role to proceed.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div onClick={() => navigate('/admin')} className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-emerald-500/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 group">
          <div className="flex flex-col items-center text-center">
            <AdminIcon className="h-16 w-16 text-emerald-400 mb-4 group-hover:text-emerald-300 transition-colors" />
            <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
            <p className="text-gray-400 mb-4">Manage visitors, events, and generate QR codes.</p>
            <span className="flex items-center font-semibold text-emerald-500 group-hover:text-white transition-colors">
              Login to Dashboard <ArrowRightIcon className="w-5 h-5 ml-2" />
            </span>
          </div>
        </div>
        <div onClick={() => navigate('/scan')} className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-emerald-500/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 group">
          <div className="flex flex-col items-center text-center">
            <UserIcon className="h-16 w-16 text-emerald-400 mb-4 group-hover:text-emerald-300 transition-colors" />
            <h2 className="text-2xl font-bold text-white mb-2">Guest / Entrant</h2>
            <p className="text-gray-400 mb-4">Use your camera to scan a QR code for check-in or event registration.</p>
             <span className="flex items-center font-semibold text-emerald-500 group-hover:text-white transition-colors">
              Scan QR Code <ArrowRightIcon className="w-5 h-5 ml-2" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const QRScannerPage: React.FC<{}> = ({}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'idle' | 'scanning' | 'error' | 'no_camera'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const isProcessingRef = useRef(false);

    const tick = useCallback(() => {
        if (isProcessingRef.current) {
            return;
        }

        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    try {
                        const url = new URL(code.data);
                        const hashPath = url.hash;
                        if (hashPath && hashPath.startsWith('#/')) {
                            isProcessingRef.current = true; // Lock processing

                            // Stop camera and animation frame before navigating to prevent re-scans
                            if (animationFrameId.current) {
                                cancelAnimationFrame(animationFrameId.current);
                            }
                            if (videoRef.current && videoRef.current.srcObject) {
                                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                            }

                            const route = hashPath.substring(1);
                            navigate(route);
                            return; // Stop this tick
                        }
                    } catch (e) {
                        // Not a valid URL or doesn't match expected format, ignore and continue scanning.
                    }
                }
            }
        }
        animationFrameId.current = requestAnimationFrame(tick);
    }, [navigate]);

    useEffect(() => {
        isProcessingRef.current = false;

        const startScan = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setStatus('no_camera');
                setErrorMessage("Your browser does not support camera access.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true');
                    await videoRef.current.play();
                    setStatus('scanning');
                    animationFrameId.current = requestAnimationFrame(tick);
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setStatus('error');
                setErrorMessage("Camera access was denied. Please enable camera permissions in your browser settings and refresh the page.");
            }
        };
        startScan();

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
        };
    }, [tick]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-black">
            <h2 className="text-2xl font-bold mb-4 text-center">Scan QR Code</h2>
            <p className="text-gray-400 mb-6 text-center max-w-sm">
                {status === 'scanning' ? "Position the QR code within the frame." : "Initializing camera..."}
            </p>
            <div className="w-full max-w-md aspect-square bg-gray-800 rounded-2xl overflow-hidden relative shadow-lg">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {status === 'scanning' && (
                     <div className="absolute inset-0 border-8 border-white/20 rounded-2xl">
                        <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                        <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                     </div>
                )}
                 {status !== 'scanning' && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        {status === 'idle' && <Spinner />}
                        {(status === 'error' || status === 'no_camera') && (
                             <div className="text-center p-4">
                                <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                <p className="text-red-300">{errorMessage}</p>
                            </div>
                        )}
                    </div>
                 )}
            </div>
             <Button onClick={() => navigate('/')} className="mt-8 bg-gray-700 hover:bg-gray-600 focus:ring-gray-500">
                Cancel
            </Button>
        </div>
    );
};


const ScanHandler: React.FC<{ mode: 'gate' | 'event'; db: MockDb }> = ({ mode, db }) => {
    const { handleVisitorScan, hasVisitorRegisteredForEvent, getEventById, getLatestLogForVisitor } = db;
    const navigate = useNavigate();
    const { eventId } = useParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState('');

    useEffect(() => {
        const processScan = async () => {
            const visitorId = localStorage.getItem(VISITOR_ID_KEY);

            // If it's a new visitor (no ID), they must register.
            if (!visitorId) {
                if (mode === 'gate') {
                    navigate('/visitor/register');
                } else { // mode === 'event'
                    navigate(`/event/${eventId}/register`);
                }
                return;
            }

            // For returning visitors, handle event logic separately
            if (mode === 'event' && eventId) {
                const isRegistered = await hasVisitorRegisteredForEvent(visitorId, eventId);
                if (isRegistered) {
                    // Already registered, show success message and stop.
                    setStatus('success');
                    setMessage("You're All Set!");
                    const event = await getEventById(eventId);
                    const visitor = await getLatestLogForVisitor(visitorId);
                    setDetails(`Hello ${visitor?.name || ''}, you have already registered for "${event?.name || 'this event'}". No further action is needed.`);
                    return;
                } else {
                    // Not registered for THIS event, go to the registration form.
                    navigate(`/event/${eventId}/register`);
                    return;
                }
            }

            // Gate logic remains for check-in/out
            if (mode === 'gate') {
                try {
                    const result = await handleVisitorScan(visitorId, undefined);
                    setStatus('success');
                    
                    const actionText = result.action === 'checkin' ? 'Checked In' : 'Checked Out';
                    const detailText = `Welcome back, ${result.log.name}. Your status has been updated.`;
                    
                    setMessage(`${actionText} Successfully!`);
                    setDetails(detailText);

                } catch (error) {
                    setStatus('error');
                    setMessage('An Error Occurred');
                    setDetails('Could not process your request. Please try again or contact an administrator.');
                }
            }
        };

        if (status === 'processing') {
            processScan();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, eventId, mode, navigate, handleVisitorScan, hasVisitorRegisteredForEvent, getEventById, getLatestLogForVisitor]);
    
    if (status === 'processing') {
        return <div className="flex flex-col items-center justify-center min-h-[80vh]"><Spinner /><p className="mt-4 text-lg">Processing your scan...</p></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {status === 'success' ? (
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                )}
            </div>
            <h1 className="text-4xl font-bold mb-2">{message}</h1>
            <p className="text-gray-300 max-w-md">{details}</p>
            <Button onClick={() => navigate('/')} className="mt-8">Return to Home</Button>
        </div>
    );
};

const AlreadyRegistered: React.FC<{ eventName: string }> = ({ eventName }) => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-emerald-500">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-4xl font-bold mb-2">You're on the list!</h1>
            <p className="text-gray-300 max-w-md mb-4">You have already registered for the event: <span className="font-bold text-emerald-400">{eventName}</span>.</p>
            <p className="text-gray-400 text-sm max-w-md">No further action is needed. Enjoy the event!</p>
            <Button onClick={() => navigate('/')} className="mt-8">Go to Home</Button>
        </div>
    );
};

const RegistrationForm: React.FC<{ mode: 'gate' | 'event'; db: MockDb }> = ({ mode, db }) => {
    const { registerNewVisitor, getEventById, getLatestLogForVisitor, hasVisitorRegisteredForEvent } = db;
    const navigate = useNavigate();
    const { eventId } = useParams();
    const [eventName, setEventName] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        organization: '',
        department: '',
        laptopName: '',
        laptopColor: '',
        serialNumber: '',
        visitorType: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState<boolean | null>(null);
    const [eventCustomFields, setEventCustomFields] = useState<FormField[]>([]);
    const [customFormData, setCustomFormData] = useState<Record<string, string>>({});

    useEffect(() => {
        const existingVisitorId = localStorage.getItem(VISITOR_ID_KEY);

        const initializeForm = async () => {
            // Event-specific logic
            if (mode === 'event' && eventId) {
                const event = await getEventById(eventId);
                if (event) {
                    setEventName(event.name);
                    setEventCustomFields(event.customFields || []);
                } else { 
                    navigate('/'); 
                    return; 
                } // Event not found

                // Check if this visitor has already registered for this event
                if (existingVisitorId) {
                    const hasRegistered = await hasVisitorRegisteredForEvent(existingVisitorId, eventId);
                    if (hasRegistered) {
                        setAlreadyRegistered(true);
                        return; // Stop processing, show "already registered" screen
                    }
                }
            }
            setAlreadyRegistered(false); // Show form

            // Pre-fill form if it's a returning visitor for a better user experience
            if (existingVisitorId) {
                const details = await getLatestLogForVisitor(existingVisitorId);
                if (details) {
                    setFormData(prev => ({
                        ...prev,
                        name: details.name || '',
                        organization: details.organization || '',
                        department: details.department || '',
                        laptopName: details.laptopName || '',
                        laptopColor: details.laptopColor || '',
                        serialNumber: details.serialNumber || '',
                        visitorType: details.visitorType || '',
                    }));
                }
            }
        };

        initializeForm();
    }, [mode, eventId, getEventById, navigate, getLatestLogForVisitor, hasVisitorRegisteredForEvent]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCustomFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        for (const field of eventCustomFields) {
            if (field.required && !customFormData[field.id]?.trim()) {
                alert(`Please fill out the required field: "${field.label}"`);
                return;
            }
        }
        
        setIsLoading(true);
        try {
            const existingVisitorId = localStorage.getItem(VISITOR_ID_KEY);
            const { visitorId } = await registerNewVisitor(formData, eventId, existingVisitorId, customFormData);
            
            // If it was a new visitor, set their ID in storage for future visits.
            if (!existingVisitorId) {
                localStorage.setItem(VISITOR_ID_KEY, visitorId);
            }
            navigate('/register/success', { state: { mode } });
        } catch (error) {
            console.error('Registration failed:', error);
            setIsLoading(false);
        }
    };

    if (alreadyRegistered === null) {
        return <div className="flex flex-col items-center justify-center min-h-[80vh]"><Spinner /><p className="mt-4 text-lg">Checking registration status...</p></div>;
    }

    if (alreadyRegistered) {
        return <AlreadyRegistered eventName={eventName} />;
    }

    const isGate = mode === 'gate';

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <div className="p-8">
                    <h2 className="text-3xl font-bold text-center mb-2">
                        {isGate ? 'Visitor Registration' : 'Event Attendance'}
                    </h2>
                    {eventName && <p className="text-center text-emerald-400 mb-6 text-lg">{eventName}</p>}
                    {!eventName && !isGate && <div className="text-center mb-6"><Spinner /></div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input id="name" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
                        
                        {isGate ? (
                            <>
                                <Input id="department" name="department" placeholder="Department" value={formData.department} onChange={handleChange} required />
                                <Input id="laptopName" name="laptopName" placeholder="Laptop's Name (Optional)" value={formData.laptopName} onChange={handleChange} />
                                <Input id="laptopColor" name="laptopColor" placeholder="Laptop's Colour (Optional)" value={formData.laptopColor} onChange={handleChange} />
                                <Input id="serialNumber" name="serialNumber" placeholder="Serial Number (Optional)" value={formData.serialNumber} onChange={handleChange} />
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Are you a... <span className="text-red-400">*</span>
                                    </label>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                                        {Object.values(VisitorType).map((type) => (
                                            <div key={type} className="flex items-center">
                                                <input
                                                    id={`visitorType-${type}`}
                                                    name="visitorType"
                                                    type="radio"
                                                    value={type}
                                                    checked={formData.visitorType === type}
                                                    onChange={handleChange}
                                                    required
                                                    className="h-4 w-4 text-emerald-600 bg-gray-700 border-gray-600 focus:ring-emerald-500"
                                                />
                                                <label htmlFor={`visitorType-${type}`} className="ml-2 block text-sm text-gray-300">
                                                    {type}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                             <Input id="organization" name="organization" placeholder="Organization (Optional)" value={formData.organization} onChange={handleChange} />
                        )}
                        
                        {eventCustomFields.length > 0 && <hr className="border-gray-700" />}

                        {eventCustomFields.map(field => (
                            <div key={field.id} className="space-y-2">
                                <label htmlFor={field.id} className="block text-sm font-medium text-gray-300">
                                    {field.label} {field.required && <span className="text-red-400">*</span>}
                                </label>
                                {field.type === 'text' && (
                                    <Input
                                        id={field.id}
                                        name={field.id}
                                        placeholder={field.label}
                                        value={customFormData[field.id] || ''}
                                        onChange={handleCustomFieldChange}
                                        required={field.required}
                                    />
                                )}
                                {field.type === 'radio' && field.options && (
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                                        {field.options.map((option, index) => (
                                            <div key={index} className="flex items-center">
                                                <input
                                                    id={`${field.id}-${index}`}
                                                    name={field.id}
                                                    type="radio"
                                                    value={option}
                                                    checked={customFormData[field.id] === option}
                                                    onChange={handleCustomFieldChange}
                                                    required={field.required}
                                                    className="h-4 w-4 text-emerald-600 bg-gray-700 border-gray-600 focus:ring-emerald-500"
                                                />
                                                <label htmlFor={`${field.id}-${index}`} className="ml-2 block text-sm text-gray-300">
                                                    {option}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        <Button type="submit" disabled={isLoading} className="w-full !mt-8">
                            {isLoading ? <Spinner /> : isGate ? 'Submit & Check In' : 'Submit Attendance'}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

const RegistrationSuccess: React.FC<{}> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const mode = location.state?.mode || 'gate';

    const message = mode === 'event' 
        ? "You have successfully registered for the event. Your attendance has been recorded."
        : "You have been successfully checked in. Your device is now remembered for future visits.";

    const subMessage = mode === 'event'
        ? "No further action is needed. Enjoy the event!"
        : "Next time, simply scan the QR code to automatically check in or out.";

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-emerald-500">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-4xl font-bold mb-2">Registration Complete!</h1>
            <p className="text-gray-300 max-w-md mb-4">{message}</p>
            <p className="text-gray-400 text-sm max-w-md">{subMessage}</p>
            <Button onClick={() => navigate('/')} className="mt-8">Go to Home</Button>
        </div>
    );
};


const AdminLogin: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Hardcoded credentials for frontend prototype
        if (username === 'admin' && password === 'password') {
            localStorage.setItem(ADMIN_AUTH_KEY, 'true');
            onLogin();
            navigate('/admin/dashboard');
        } else {
            setError('Invalid credentials.');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <div className="p-8">
                    <div className="text-center mb-6">
                        <AdminIcon className="w-16 h-16 mx-auto text-emerald-400" />
                        <h2 className="text-3xl font-bold mt-2">Admin Login</h2>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input id="username" name="username" type="text" placeholder="Admin Name" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        <Input id="password" name="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <Button type="submit" className="w-full !mt-6">
                            <LoginIcon className="w-5 h-5 mr-2"/>
                            Login
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

const CustomFieldsBuilder: React.FC<{ fields: FormField[], setFields: React.Dispatch<React.SetStateAction<FormField[]>> }> = ({ fields, setFields }) => {
    const addField = (type: 'text' | 'radio') => {
        const newField: FormField = {
            id: uuidv4(),
            label: '',
            type,
            required: false,
            ...(type === 'radio' && { options: ['Option 1', 'Option 2'] })
        };
        setFields([...fields, newField]);
    };

    const updateField = (id: string, prop: keyof FormField, value: any) => {
        setFields(fields.map(f => f.id === id ? { ...f, [prop]: value } : f));
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const updateOption = (fieldId: string, optionIndex: number, value: string) => {
        setFields(fields.map(f => {
            if (f.id === fieldId) {
                const newOptions = [...(f.options || [])];
                newOptions[optionIndex] = value;
                return { ...f, options: newOptions };
            }
            return f;
        }));
    };
    
    const addOption = (fieldId: string) => {
        setFields(fields.map(f => f.id === fieldId ? { ...f, options: [...(f.options || []), 'New Option'] } : f));
    };

    const removeOption = (fieldId: string, optionIndex: number) => {
        setFields(fields.map(f => {
            if (f.id === fieldId) {
                const newOptions = (f.options || []).filter((_, i) => i !== optionIndex);
                return { ...f, options: newOptions };
            }
            return f;
        }));
    };


    return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            {fields.length === 0 && <p className="text-gray-400 text-center py-4">No custom fields added. Visitors will only be asked for their name and organization.</p>}
            {fields.map(field => (
                <div key={field.id} className="p-4 bg-gray-700/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Field Label (e.g., Phone Number)"
                            value={field.label}
                            onChange={(e) => updateField(field.id, 'label', e.target.value)}
                            className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button onClick={() => removeField(field.id)} className="p-2 text-gray-400 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400 capitalize">{field.type} Field</span>
                         <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                                className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-emerald-600 focus:ring-emerald-500"
                            />
                            Required
                        </label>
                    </div>
                    {field.type === 'radio' && (
                        <div className="pl-4 border-l-2 border-gray-600 space-y-2">
                            {field.options?.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                     <input
                                        type="text"
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) => updateOption(field.id, index, e.target.value)}
                                        className="flex-grow px-3 py-1.5 bg-gray-600 border border-gray-500 rounded-md text-sm"
                                    />
                                    <button onClick={() => removeOption(field.id, index)} className="p-1 text-gray-500 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                            <button onClick={() => addOption(field.id)} className="text-emerald-400 text-sm hover:text-emerald-300">+ Add Option</button>
                        </div>
                    )}
                </div>
            ))}
            <div className="flex gap-4 pt-4 border-t border-gray-700">
                <Button onClick={() => addField('text')} className="w-full bg-gray-600 hover:bg-gray-500 focus:ring-gray-400 text-sm !py-2">Add Text Field</Button>
                <Button onClick={() => addField('radio')} className="w-full bg-gray-600 hover:bg-gray-500 focus:ring-gray-400 text-sm !py-2">Add Radio Field</Button>
            </div>
        </div>
    );
};


const AdminDashboard: React.FC<{ onLogout: () => void; db: MockDb }> = ({ onLogout, db }) => {
    const { getVisitorLogs, getStats, createEvent, getEvents, addManualVisitorLog } = db;
    const navigate = useNavigate();
    const [logs, setLogs] = useState<VisitorLog[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'logs' | 'qr' | 'events'>('logs');
    const [newEventName, setNewEventName] = useState('');
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedEventForQR, setSelectedEventForQR] = useState<Event | null>(null);
    const [isConfirmingGateQR, setIsConfirmingGateQR] = useState(false);
    const [gateQRKey, setGateQRKey] = useState(() => Date.now().toString());
    const [isGateQrModalOpen, setIsGateQrModalOpen] = useState(false);
    const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<Event | null>(null);
    const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
    const [customFields, setCustomFields] = useState<FormField[]>([]);
    const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
    
    // Helper to format date for datetime-local input
    const toDateTimeLocal = (date: Date) => {
        const ten = (i: number) => (i < 10 ? '0' : '') + i;
        const YYYY = date.getFullYear();
        const MM = ten(date.getMonth() + 1);
        const DD = ten(date.getDate());
        const HH = ten(date.getHours());
        const mm = ten(date.getMinutes());
        return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
    };

    const initialManualEntryState = {
        name: '',
        department: '',
        laptopName: '',
        laptopColor: '',
        serialNumber: '',
        visitorType: VisitorType.GUEST,
        checkIn: toDateTimeLocal(new Date()),
        checkOut: '',
    };
    
    const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
    const [manualEntryData, setManualEntryData] = useState(initialManualEntryState);
    const [isSubmittingManualEntry, setIsSubmittingManualEntry] = useState(false);


    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [logsData, statsData, eventsData] = await Promise.all([getVisitorLogs(), getStats(), getEvents()]);
            setLogs(logsData);
            setStats(statsData);
            setEvents(eventsData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    }, [getVisitorLogs, getStats, getEvents]);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3100); // Hide after animation
    };
    
    useEffect(() => {
        refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    const handleCreateEvent = async () => {
        if (!newEventName.trim()) return;
        setIsCreatingEvent(true);
        const newEvent = await createEvent(newEventName, customFields);
        setNewEventName('');
        setCustomFields([]); // Reset custom fields after creation
        // Manually update state for immediate UI feedback to avoid stale data from refreshData
        setEvents(prevEvents => [newEvent, ...prevEvents].sort((a,b) => b.createdAt - a.createdAt));
        setStats(prevStats => prevStats ? { ...prevStats, totalEvents: prevStats.totalEvents + 1 } : null);
        setIsCreatingEvent(false);
        showToast('Event QR code generated successfully!');
    };

    const confirmRecreateGateQR = () => {
        setGateQRKey(Date.now().toString()); // Update key to force new URL and QR code
        setIsConfirmingGateQR(false);
        showToast('Main Gate QR code refreshed!');
    };

    const handleManualEntryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setManualEntryData(prev => ({ ...prev, [name]: value as any }));
    };

    const handleManualEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualEntryData.name.trim() || !manualEntryData.department.trim() || !manualEntryData.checkIn) {
            alert('Please fill out Name, Department, and Check-in Time.');
            return;
        }

        const checkInTimestamp = new Date(manualEntryData.checkIn).getTime();
        const checkOutTimestamp = manualEntryData.checkOut ? new Date(manualEntryData.checkOut).getTime() : undefined;

        if (checkOutTimestamp && checkOutTimestamp <= checkInTimestamp) {
            alert('Check-out time must be after check-in time.');
            return;
        }
        
        setIsSubmittingManualEntry(true);
        try {
            await addManualVisitorLog({
                ...manualEntryData,
                checkIn: checkInTimestamp,
                checkOut: checkOutTimestamp,
            });
            setIsManualEntryModalOpen(false);
            setManualEntryData(initialManualEntryState);
            showToast('Manual log added successfully!');
            await refreshData();
        } catch (error) {
            console.error("Failed to add manual log:", error);
            showToast("Error: Could not add manual log.");
        } finally {
            setIsSubmittingManualEntry(false);
        }
    };


    const filteredLogs = React.useMemo(() => {
        let tempLogs = logs;

        // Apply status filter first
        if (filter === 'IN') {
            tempLogs = tempLogs.filter(log => log.status === VisitorStatus.IN);
        } else if (filter === 'OUT') {
            tempLogs = tempLogs.filter(log => ![VisitorStatus.IN, VisitorStatus.REGISTERED].includes(log.status));
        }

        // Apply search query filter
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            tempLogs = tempLogs.filter(log => {
                return (
                    log.name?.toLowerCase().includes(lowercasedQuery) ||
                    log.visitorType?.toLowerCase().includes(lowercasedQuery) ||
                    log.department?.toLowerCase().includes(lowercasedQuery) ||
                    log.laptopName?.toLowerCase().includes(lowercasedQuery) ||
                    log.laptopColor?.toLowerCase().includes(lowercasedQuery) ||
                    log.serialNumber?.toLowerCase().includes(lowercasedQuery) ||
                    (log.eventName || 'Main Gate').toLowerCase().includes(lowercasedQuery)
                );
            });
        }
        
        return tempLogs;
    }, [logs, filter, searchQuery]);

    const openQrModal = (event: Event) => setSelectedEventForQR(event);
    const closeQrModal = () => setSelectedEventForQR(null);
    
    const openGateQrModal = () => setIsGateQrModalOpen(true);
    const closeGateQrModal = () => setIsGateQrModalOpen(false);
    
    const openAttendeesModal = (event: Event) => setSelectedEventForAttendees(event);
    const closeAttendeesModal = () => {
        setSelectedEventForAttendees(null);
        setAttendeeSearchQuery(''); // Reset search on close
    };
    
    const gateQRUrl = `${window.location.origin}${window.location.pathname}#/gate?v=${gateQRKey}`;

    const handleDownloadGateQR = async () => {
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(gateQRUrl)}`;
        
        try {
            const response = await fetch(qrApiUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const fileName = `QR_Main_Gate.png`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error("Failed to download QR code", error);
            showToast("Failed to download QR code.");
        }
    };

    const handleDownloadEventQR = async () => {
        if (!selectedEventForQR) return;
        const eventUrl = `${window.location.origin}${window.location.pathname}#/event/${selectedEventForQR.id}`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(eventUrl)}`;
        
        try {
            const response = await fetch(qrApiUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const fileName = `QR_${selectedEventForQR.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error("Failed to download QR code", error);
            showToast("Failed to download QR code.");
        }
    };
    
    const StatusBadge: React.FC<{status: VisitorStatus}> = ({status}) => {
        const styles = {
            [VisitorStatus.IN]: 'bg-green-500/20 text-green-400',
            [VisitorStatus.OUT]: 'bg-yellow-500/20 text-yellow-400',
            [VisitorStatus.AUTO_CHECKOUT]: 'bg-gray-500/20 text-gray-400',
            [VisitorStatus.REGISTERED]: 'bg-blue-500/20 text-blue-400',
        };
        return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status.replace('_', ' ')}</span>;
    };

    const handleDownloadLogs = () => {
        if (filteredLogs.length === 0) {
            showToast("No log data to download.");
            return;
        }

        const dataToExport = filteredLogs.map(log => ({
            Name: log.name,
            Status: log.status,
            Type: log.visitorType || 'N/A',
            Department: log.department || 'N/A',
            Organization: log.organization || 'N/A',
            Context: log.eventName || 'Main Gate',
            "Check In Time": new Date(log.checkIn).toLocaleString(),
            "Check Out Time": log.checkOut ? new Date(log.checkOut).toLocaleString() : 'N/A',
            Duration: log.duration || 'N/A',
            "Laptop Name": log.laptopName || 'N/A',
            "Laptop Color": log.laptopColor || 'N/A',
            "Serial Number": log.serialNumber || 'N/A',
        }));

        downloadXLSX(dataToExport, `visitor_logs_${new Date().toISOString().split('T')[0]}`);
    };

    const handleDownloadAttendees = () => {
        if (!selectedEventForAttendees) return;

        const eventLogs = logs.filter(log => log.eventId === selectedEventForAttendees.id);

        if (eventLogs.length === 0) {
            showToast("No attendee data to download for this event.");
            return;
        }

        const dataToExport = eventLogs.map(log => {
            const baseData: Record<string, any> = {
                Name: log.name,
                Organization: log.organization || 'N/A',
                "Registration Time": new Date(log.checkIn).toLocaleString(),
            };

            if (selectedEventForAttendees.customFields) {
                for (const field of selectedEventForAttendees.customFields) {
                    baseData[field.label] = log.customData?.[field.id] || 'N/A';
                }
            }
            return baseData;
        });

        const safeEventName = selectedEventForAttendees.name.replace(/[^a-z0-9]/gi, '_');
        downloadXLSX(dataToExport, `attendees_${safeEventName}_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">
                    <LogoutIcon className="w-5 h-5 mr-2"/>
                    Logout
                </Button>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="p-5">
                    <h3 className="text-gray-400">Currently In</h3>
                    <p className="text-4xl font-bold text-emerald-400">{stats?.currentlyIn ?? '...'}</p>
                </Card>
                <Card className="p-5">
                    <h3 className="text-gray-400">Visitors Today</h3>
                    <p className="text-4xl font-bold">{stats?.totalVisitorsToday ?? '...'}</p>
                </Card>
                 <Card className="p-5">
                    <h3 className="text-gray-400">Total Events Created</h3>
                    <p className="text-4xl font-bold">{stats?.totalEvents ?? '...'}</p>
                </Card>
            </div>

            {/* View Toggles */}
            <div className="flex border-b border-gray-700 mb-6">
                <button onClick={() => setView('logs')} className={`px-6 py-3 font-medium ${view === 'logs' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'}`}>Visitor Logs</button>
                <button onClick={() => setView('qr')} className={`px-6 py-3 font-medium ${view === 'qr' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'}`}>QR Management</button>
                <button onClick={() => setView('events')} className={`px-6 py-3 font-medium ${view === 'events' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'}`}>Event Analytics</button>
            </div>
            
            {view === 'logs' ? (
                 <Card className="p-0">
                    <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-700 gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex space-x-2 bg-gray-900 p-1 rounded-md">
                                 {(['ALL', 'IN', 'OUT'] as const).map(f => (
                                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-sm font-medium rounded ${filter === f ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                        {f === 'OUT' ? 'Checked Out' : f === 'IN' ? 'Currently In' : 'All'}
                                    </button>
                                ))}
                            </div>
                             <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <SearchIcon className="w-5 h-5 text-gray-400" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search logs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button onClick={() => setIsManualEntryModalOpen(true)} className="!px-4 !py-2 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500">
                                <PlusIcon className="w-5 h-5 mr-2"/>
                                Add Manual Entry
                            </Button>
                            <Button onClick={handleDownloadLogs} disabled={isLoading} title="Download as Excel" className="!px-4 !py-2 bg-gray-600 hover:bg-gray-500 focus:ring-gray-400">
                               <DownloadIcon className="w-5 h-5"/>
                            </Button>
                            <Button onClick={refreshData} disabled={isLoading} title="Refresh Data" className="!px-4 !py-2">
                               <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}/>
                            </Button>
                        </div>
                    </div>
                     <div className="overflow-x-auto">
                         <table className="w-full min-w-[1400px] text-sm text-left text-gray-300">
                             <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Name</th>
                                    <th scope="col" className="px-6 py-3">Type</th>
                                    <th scope="col" className="px-6 py-3">Department</th>
                                    <th scope="col" className="px-6 py-3">Laptop Name</th>
                                    <th scope="col" className="px-6 py-3">Laptop Color</th>
                                    <th scope="col" className="px-6 py-3">Serial Number</th>
                                    <th scope="col" className="px-6 py-3 hidden sm:table-cell">Context</th>
                                    <th scope="col" className="px-6 py-3">Check In</th>
                                    <th scope="col" className="px-6 py-3">Check Out</th>
                                    <th scope="col" className="px-6 py-3">Duration</th>
                                    <th scope="col" className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={11} className="text-center p-8"><Spinner /></td></tr>
                                ) : filteredLogs.length > 0 ? (
                                    filteredLogs.map(log => (
                                         <tr key={log.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="px-6 py-4 font-medium whitespace-nowrap">{log.name}</td>
                                            <td className="px-6 py-4">{log.visitorType || '—'}</td>
                                            <td className="px-6 py-4">{log.department || '—'}</td>
                                            <td className="px-6 py-4">{log.laptopName || '—'}</td>
                                            <td className="px-6 py-4">{log.laptopColor || '—'}</td>
                                            <td className="px-6 py-4">{log.serialNumber || '—'}</td>
                                            <td className="px-6 py-4 hidden sm:table-cell">{log.eventName || 'Main Gate'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(log.checkIn).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{log.checkOut ? new Date(log.checkOut).toLocaleString() : '—'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{log.duration || '—'}</td>
                                            <td className="px-6 py-4 text-center"><StatusBadge status={log.status} /></td>
                                        </tr>
                                    ))
                                ) : (
                                     <tr><td colSpan={11} className="text-center p-8">No logs found. Register a visitor to see data here.</td></tr>
                                )}
                            </tbody>
                         </table>
                    </div>
                </Card>
            ) : view === 'qr' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">Main Gate QR Code</h3>
                            <p className="text-gray-400 mb-4">Display this at the main entrance for general visitor check-in/out.</p>
                            <div 
                                className="bg-white p-4 inline-block rounded-lg shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={openGateQrModal}
                            >
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(gateQRUrl)}`} alt="Main Gate QR Code" />
                            </div>
                            <Button onClick={() => setIsConfirmingGateQR(true)} className="mt-4"><RefreshIcon className="w-5 h-5 mr-2"/> Re-create Code</Button>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">Event QR Codes</h3>
                            <div className="mb-6 space-y-3">
                                <p className="text-gray-400">Create a unique QR code for a specific event or conference.</p>
                                <Input id="newEventName" name="newEventName" placeholder="Enter new event name" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} />
                                <button onClick={() => setIsCustomFieldsModalOpen(true)} className="text-sm text-emerald-400 hover:text-emerald-300 w-full text-left p-2 rounded hover:bg-gray-700/50 transition-colors duration-200">
                                    + Add Custom Registration Fields ({customFields.length})
                                </button>
                                <Button onClick={handleCreateEvent} disabled={isCreatingEvent || !newEventName.trim()} className="w-full">
                                    {isCreatingEvent ? <Spinner /> : <><PlusIcon className="w-5 h-5 mr-2"/>Generate Event QR</>}
                                </Button>
                            </div>
                            <h4 className="font-semibold mb-3 border-t border-gray-700 pt-4">Existing Events</h4>
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                {events.length > 0 ? events.map(event => {
                                    const eventUrl = `${window.location.origin}${window.location.pathname}#/event/${event.id}`;
                                    return (
                                        <div key={event.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                            <div>
                                                <p className="font-semibold">{event.name}</p>
                                                <p className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(eventUrl)}`} 
                                                alt={event.name} 
                                                className="rounded cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => openQrModal(event)}
                                            />
                                        </div>
                                    );
                                }) : <p className="text-gray-400 text-sm">No events created yet.</p>}
                            </div>
                        </div>
                    </Card>
                </div>
            ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                         <div className="col-span-full text-center py-12"><Spinner /></div>
                    ) : events.length > 0 ? (
                        events.map(event => {
                            const eventLogs = logs.filter(log => log.eventId === event.id);
                            const totalAttendees = new Set(eventLogs.map(log => log.visitorId)).size;

                            return (
                                <Card key={event.id} className="p-6 flex flex-col">
                                    <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                                    <p className="text-sm text-gray-400 mb-4">Created: {new Date(event.createdAt).toLocaleDateString()}</p>
                                    <div className="bg-gray-700/50 p-4 rounded-lg text-center mb-4 flex-grow flex flex-col justify-center">
                                        <p className="text-4xl font-bold text-emerald-400">{totalAttendees}</p>
                                        <p className="text-sm text-gray-400">Total Attendees</p>
                                    </div>
                                    <Button onClick={() => openAttendeesModal(event)} className="mt-auto">
                                       <UserIcon className="w-5 h-5 mr-2" />
                                       View Attendees
                                    </Button>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12 bg-gray-800 rounded-lg">
                           <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
                           <p className="text-gray-400">Go to the "QR Management" tab to create your first event.</p>
                        </div>
                    )}
                </div>
            )}
            <Toast message={toastMessage} show={!!toastMessage} />
            <Modal isOpen={isCustomFieldsModalOpen} onClose={() => setIsCustomFieldsModalOpen(false)} title="Customize Registration Form" size="lg">
                <CustomFieldsBuilder fields={customFields} setFields={setCustomFields} />
            </Modal>
            <Modal isOpen={!!selectedEventForQR} onClose={closeQrModal} title={selectedEventForQR?.name || 'Event QR Code'}>
                {selectedEventForQR && (
                    <div className="flex flex-col items-center text-center">
                        <p className="text-gray-400 mb-4">Scan to register for "{selectedEventForQR.name}"</p>
                        <div className="bg-white p-4 inline-block rounded-lg shadow-md mb-6">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/event/${selectedEventForQR.id}`)}`} 
                                alt={`${selectedEventForQR.name} QR Code`} 
                            />
                        </div>
                        <Button onClick={handleDownloadEventQR}>
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            Download QR Code
                        </Button>
                    </div>
                )}
            </Modal>
            <Modal isOpen={isGateQrModalOpen} onClose={closeGateQrModal} title="Main Gate QR Code">
                <div className="flex flex-col items-center text-center">
                    <p className="text-gray-400 mb-4">Scan for general visitor check-in and check-out.</p>
                    <div className="bg-white p-4 inline-block rounded-lg shadow-md mb-6">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(gateQRUrl)}`} 
                            alt="Main Gate QR Code" 
                        />
                    </div>
                    <Button onClick={handleDownloadGateQR}>
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Download QR Code
                    </Button>
                </div>
            </Modal>
            <Modal 
                isOpen={isConfirmingGateQR} 
                onClose={() => setIsConfirmingGateQR(false)} 
                title="Confirm QR Code Recreation"
            >
                <div className="text-center">
                    <p className="text-gray-300 mb-6">
                        Are you sure you want to re-create the main gate QR code? This action will generate a new code.
                    </p>
                    <div className="flex justify-end gap-4">
                        <Button onClick={() => setIsConfirmingGateQR(false)} className="bg-gray-600 hover:bg-gray-700 focus:ring-gray-500">
                            Cancel
                        </Button>
                        <Button onClick={confirmRecreateGateQR}>
                            Confirm & Re-create
                        </Button>
                    </div>
                </div>
            </Modal>
             <Modal 
                isOpen={!!selectedEventForAttendees} 
                onClose={closeAttendeesModal} 
                title={`Attendees for "${selectedEventForAttendees?.name}"`}
                size="xl"
            >
                {selectedEventForAttendees && (() => {
                    const eventLogs = logs.filter(log => log.eventId === selectedEventForAttendees.id).sort((a,b) => b.checkIn - a.checkIn);
                    
                    const filteredAttendees = attendeeSearchQuery.trim()
                        ? eventLogs.filter(log => {
                            const lowercasedQuery = attendeeSearchQuery.toLowerCase();
                            const nameMatch = log.name?.toLowerCase().includes(lowercasedQuery);
                            const orgMatch = log.organization?.toLowerCase().includes(lowercasedQuery);
                            
                            let customFieldMatch = false;
                            if (selectedEventForAttendees.customFields && log.customData) {
                                customFieldMatch = selectedEventForAttendees.customFields.some(field => 
                                    log.customData?.[field.id]?.toLowerCase().includes(lowercasedQuery)
                                );
                            }
                            return nameMatch || orgMatch || customFieldMatch;
                        })
                        : eventLogs;

                    return (
                        <div>
                            <div className="flex flex-wrap items-center justify-between mb-4 -mt-2 gap-4">
                                <div className="relative flex-grow">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <SearchIcon className="w-5 h-5 text-gray-400" />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search attendees..."
                                        value={attendeeSearchQuery}
                                        onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                                        className="w-full sm:w-80 pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        autoFocus
                                    />
                                </div>
                                 <Button onClick={handleDownloadAttendees} className="!px-4 !py-2 text-sm">
                                    <DownloadIcon className="w-4 h-4 mr-2" />
                                    Download List
                                </Button>
                            </div>
                            <div className="max-h-[60vh] overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-300">
                                     <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Name</th>
                                            <th scope="col" className="px-6 py-3">Organization</th>
                                            {(selectedEventForAttendees.customFields || []).map(field => (
                                                <th key={field.id} scope="col" className="px-6 py-3">{field.label}</th>
                                            ))}
                                            <th scope="col" className="px-6 py-3">Registration Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            if (filteredAttendees.length === 0) {
                                                const colSpan = 3 + (selectedEventForAttendees.customFields?.length || 0);
                                                const message = eventLogs.length === 0 ? "No attendees have registered yet." : "No matching attendees found.";
                                                return <tr><td colSpan={colSpan} className="text-center p-8">{message}</td></tr>
                                            }
                                            return filteredAttendees.map(log => (
                                                 <tr key={log.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 font-medium whitespace-nowrap">{log.name}</td>
                                                    <td className="px-6 py-4">{log.organization || 'N/A'}</td>
                                                    {(selectedEventForAttendees.customFields || []).map(field => (
                                                        <td key={field.id} className="px-6 py-4">{log.customData?.[field.id] || 'N/A'}</td>
                                                    ))}
                                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.checkIn).toLocaleString()}</td>
                                                </tr>
                                            ))
                                        })()}
                                    </tbody>
                                 </table>
                            </div>
                        </div>
                    )
                })()}
            </Modal>
            <Modal isOpen={isManualEntryModalOpen} onClose={() => setIsManualEntryModalOpen(false)} title="Add Manual Visitor Log" size="lg">
                <form onSubmit={handleManualEntrySubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="manual-name" className="block text-sm font-medium text-gray-300 mb-1">Full Name <span className="text-red-400">*</span></label>
                            <Input id="manual-name" name="name" placeholder="Full Name" value={manualEntryData.name} onChange={handleManualEntryChange} required />
                        </div>
                        <div>
                            <label htmlFor="manual-department" className="block text-sm font-medium text-gray-300 mb-1">Department <span className="text-red-400">*</span></label>
                            <Input id="manual-department" name="department" placeholder="Department" value={manualEntryData.department} onChange={handleManualEntryChange} required />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <label htmlFor="manual-laptopName" className="block text-sm font-medium text-gray-300 mb-1">Laptop Name</label>
                            <Input id="manual-laptopName" name="laptopName" placeholder="e.g., HP EliteBook" value={manualEntryData.laptopName} onChange={handleManualEntryChange} />
                        </div>
                        <div>
                           <label htmlFor="manual-laptopColor" className="block text-sm font-medium text-gray-300 mb-1">Laptop Colour</label>
                            <Input id="manual-laptopColor" name="laptopColor" placeholder="e.g., Silver" value={manualEntryData.laptopColor} onChange={handleManualEntryChange} />
                        </div>
                         <div>
                           <label htmlFor="manual-serialNumber" className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
                            <Input id="manual-serialNumber" name="serialNumber" placeholder="Serial Number" value={manualEntryData.serialNumber} onChange={handleManualEntryChange} />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                            Visitor Type <span className="text-red-400">*</span>
                        </label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                            {Object.values(VisitorType).map((type) => (
                                <div key={type} className="flex items-center">
                                    <input
                                        id={`manual-visitorType-${type}`}
                                        name="visitorType"
                                        type="radio"
                                        value={type}
                                        checked={manualEntryData.visitorType === type}
                                        onChange={handleManualEntryChange}
                                        required
                                        className="h-4 w-4 text-emerald-600 bg-gray-700 border-gray-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor={`manual-visitorType-${type}`} className="ml-2 block text-sm text-gray-300">
                                        {type}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="manual-checkIn" className="block text-sm font-medium text-gray-300 mb-1">Check-in Time <span className="text-red-400">*</span></label>
                            <Input id="manual-checkIn" name="checkIn" type="datetime-local" placeholder="Check-in Time" value={manualEntryData.checkIn} onChange={handleManualEntryChange} required />
                        </div>
                         <div>
                            <label htmlFor="manual-checkOut" className="block text-sm font-medium text-gray-300 mb-1">Check-out Time</label>
                            <Input id="manual-checkOut" name="checkOut" type="datetime-local" placeholder="Check-out Time" value={manualEntryData.checkOut} onChange={handleManualEntryChange} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <Button type="button" onClick={() => setIsManualEntryModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 focus:ring-gray-500">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmittingManualEntry}>
                            {isSubmittingManualEntry ? <Spinner /> : 'Save Log'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};


const ProtectedRoute: React.FC<{ isAuthenticated: boolean; children: React.ReactNode }> = ({ isAuthenticated, children }) => {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

// --- Main App Component ---

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => !!localStorage.getItem(ADMIN_AUTH_KEY));
  const db = useMockDb();

  const handleLogin = () => setIsAdminAuthenticated(true);
  const handleLogout = () => {
      localStorage.removeItem(ADMIN_AUTH_KEY);
      setIsAdminAuthenticated(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePortal />} />
          <Route path="/scan" element={<QRScannerPage />} />
          <Route path="/gate" element={<ScanHandler mode="gate" db={db} />} />
          <Route path="/visitor/register" element={<RegistrationForm mode="gate" db={db} />} />
          <Route path="/event/:eventId" element={<ScanHandler mode="event" db={db} />} />
          <Route path="/event/:eventId/register" element={<RegistrationForm mode="event" db={db} />} />
          <Route path="/register/success" element={<RegistrationSuccess />} />
          <Route path="/admin" element={<AdminLogin onLogin={handleLogin} />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAdminAuthenticated}>
                <AdminDashboard onLogout={handleLogout} db={db} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

// FIX: Removed custom Navigate component in favor of the official one from react-router-dom.
// The custom component used a useEffect for navigation which is an anti-pattern.


export default App;
