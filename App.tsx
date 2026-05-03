import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// FIX: Import `Navigate` from `react-router-dom` to use the official component.
import { Routes, Route, useNavigate, useLocation, useParams, Link, Navigate } from 'react-router-dom';
import { useMockDb } from './hooks';
import { Event, VisitorLog, VisitorStatus, Stats, FormField, VisitorType } from './types';
import { AdminIcon, ArrowRightIcon, PlusIcon, QrCodeIcon, RefreshIcon, UserIcon, LoginIcon, LogoutIcon, TrashIcon, DownloadIcon, SearchIcon, EditIcon } from './components/icons';

declare global {
    interface Window {
        jsQR: any;
        XLSX: any;
    }
}

const APP_TITLE = "NITDA CheckMe";
const VISITOR_ID_KEY = 'nitda_visitor_id';
const ADMIN_AUTH_KEY = 'nitda_admin_auth';

// --- Design Constants ---
const COLORS = {
    bg: '#0d1117',
    surface: '#161b22',
    border: '#21262d',
    primary: '#2ee89a',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    textMuted: '#484f58',
    warning: '#f0a500',
    danger: '#e05c5c'
};

// --- Mesh Background Component ---
const MeshBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        const spacing = 100; // grid spacing in pixels
        let cols = Math.ceil(width / spacing) + 1;
        let rows = Math.ceil(height / spacing) + 1;
        const points: { x: number; y: number; ox: number; oy: number }[] = [];

        const init = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            
            // Handle high DPI
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            
            cols = Math.ceil(width / spacing) + 1;
            rows = Math.ceil(height / spacing) + 1;
            points.length = 0;
            
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = (width / (cols - 1)) * i;
                    const y = (height / (rows - 1)) * j;
                    points.push({ x, y, ox: x, oy: y });
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update points with spring force
            points.forEach(p => {
                const dx = mouseRef.current.x - p.ox;
                const dy = mouseRef.current.y - p.oy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 150;

                if (dist < maxDist) {
                    const force = (maxDist - dist) / maxDist;
                    p.x = p.ox - dx * force * 0.4;
                    p.y = p.oy - dy * force * 0.4;
                } else {
                    p.x += (p.ox - p.x) * 0.08;
                    p.y += (p.oy - p.y) * 0.08;
                }
            });

            // Draw Lines
            ctx.lineWidth = 1;
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const idx = i * rows + j;
                    const p = points[idx];

                    // Horizontal
                    if (i < cols - 1) {
                        const nextP = points[(i + 1) * rows + j];
                        drawLink(p, nextP);
                    }
                    // Vertical
                    if (j < rows - 1) {
                        const nextP = points[idx + 1];
                        drawLink(p, nextP);
                    }
                }
            }

            requestAnimationFrame(animate);
        };

        const drawLink = (p1: any, p2: any) => {
            const dx = mouseRef.current.x - (p1.x + p2.x) / 2;
            const dy = mouseRef.current.y - (p1.y + p2.y) / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const intensity = dist < 110 ? Math.max(0.04, 0.26 * (1 - dist / 110)) : 0.04;

            ctx.strokeStyle = `rgba(46, 232, 154, ${intensity})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            if (dist < 80) {
                ctx.fillStyle = `rgba(46, 232, 154, ${intensity})`;
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        window.addEventListener('resize', init);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        init();
        animate();

        return () => {
            window.removeEventListener('resize', init);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 50 }} />;
};

const getBaseQRUrl = () => {
    return window.location.origin + window.location.pathname;
};

// --- Character Components ---
const Character: React.FC<{ state: 'success' | 'warning' | 'danger' }> = ({ state }) => {
    const isSuccess = state === 'success';
    const isWarning = state === 'warning';
    const isDanger = state === 'danger';

    const color = isSuccess ? COLORS.primary : isWarning ? COLORS.warning : COLORS.danger;

    return (
        <div className="flex flex-col items-center mb-6">
            <svg width="100" height="120" viewBox="0 0 100 120" style={{ overflow: 'visible' }}>
                {/* Character Head */}
                <g style={{ animation: isSuccess ? 'bob 1.1s ease-in-out infinite' : isWarning ? 'shake 0.55s ease-in-out infinite' : 'none' }}>
                    <circle cx="50" cy="40" r="25" fill="#161b22" stroke={color} strokeWidth="3" />
                    {/* Face */}
                    <text x="50" y="47" textAnchor="middle" fontSize="22">{isSuccess ? '😊' : isWarning ? '🤔' : '😟'}</text>
                </g>
                {/* Body */}
                <rect x="35" y="65" width="30" height="40" rx="4" fill="#161b22" stroke={color} strokeWidth="2" />
                {/* Arms */}
                <g style={{ transformOrigin: '35px 70px', animation: isSuccess ? 'wave 0.65s ease-in-out infinite' : 'none' }}>
                    <rect x="15" y="68" width="20" height="6" rx="3" fill={color} />
                </g>
                <g style={{ transformOrigin: '65px 70px' }}>
                    <rect x="65" y="68" width="20" height="6" rx="3" fill={color} style={{ transform: isDanger ? 'rotate(20deg)' : 'none' }} />
                </g>
            </svg>
        </div>
    );
};

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

const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg', className?: string }> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`relative ${sizes[size]} logo-glow ${className}`}>
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="18" cy="18" r="15" stroke="#2ee89a" strokeWidth="0.8" opacity="0.5"/>
        <g className="orbit-1">
          <ellipse cx="18" cy="18" rx="15" ry="6" stroke="#2ee89a" strokeWidth="0.8" opacity="0.7"/>
        </g>
        <g className="orbit-2">
          <ellipse cx="18" cy="18" rx="6" ry="15" stroke="#2ee89a" strokeWidth="0.8" opacity="0.7"/>
        </g>
        <g className="orbit-3">
          <ellipse cx="18" cy="18" rx="15" ry="8" stroke="#2ee89a" strokeWidth="0.8" opacity="0.5" transform="rotate(45 18 18)"/>
        </g>
        <g className="dot-orbit-1">
          <circle cx="33" cy="18" r="2" fill="#2ee89a" opacity="0.9"/>
        </g>
        <g className="dot-orbit-2">
          <circle cx="18" cy="3" r="1.8" fill="#2ee89a" opacity="0.9"/>
        </g>
        <g className="dot-orbit-3">
          <circle cx="30" cy="8" r="1.5" fill="#2ee89a" opacity="0.8"/>
        </g>
      </svg>
    </div>
  );
};

const Header: React.FC<{}> = ({}) => (
  <header className="bg-transparent backdrop-blur-sm sticky top-0 z-40 border-b border-[#21262d33]">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3 text-[17px] font-bold text-[#2ee89a] tracking-tight group">
          <Logo size="sm" className="group-hover:scale-110 transition-transform" />
          {APP_TITLE}
        </Link>
        <span className="hidden sm:inline-block text-[11px] uppercase tracking-widest text-[#484f58] font-semibold">Smart Visitor Management</span>
      </div>
    </div>
  </header>
);

const Toast: React.FC<{ message: string; show: boolean; }> = ({ message, show }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 bg-[#161b22] border border-[#2ee89a55] text-[#e6edf3] py-3 px-5 rounded-xl shadow-2xl z-[100] flex items-center animate-fade-up">
        <div className="w-2 h-2 rounded-full bg-[#2ee89a] mr-3 shadow-[0_0_8px_#2ee89a]" />
        <span className="text-[13px] font-medium">{message}</span>
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className={`bg-[#161b22] border border-[#21262d] rounded-[14px] shadow-2xl w-full ${sizeClasses[size]} relative animate-fade-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#21262d]">
            <h3 className="text-[15px] font-bold text-[#e6edf3]">{title}</h3>
            <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2ee89a33] border-t-[#2ee89a]"></div>
);

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-[#161b22] border border-[#21262d] rounded-[14px] shadow-sm hover:translate-y-[-2px] hover:border-[#2ee89a44] transition-all duration-300 ${className}`}>
        {children}
    </div>
);

const Button: React.FC<{ 
    onClick?: () => void; 
    children: React.ReactNode; 
    className?: string; 
    type?: 'button' | 'submit' | 'reset'; 
    disabled?: boolean;
    variant?: 'primary' | 'outline' | 'danger';
}> = ({ onClick, children, className = '', type = 'button', disabled = false, variant = 'primary' }) => {
    const variantClasses = {
        primary: 'bg-[#2ee89a] text-[#0d1117] hover:bg-[#20c984]',
        outline: 'bg-transparent border border-[#21262d] text-[#e6edf3] hover:border-[#2ee89a44] hover:bg-[#2ee89a05]',
        danger: 'bg-[#e05c5c] text-white hover:bg-[#e05c5c]/90'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center px-6 py-2.5 text-[14px] font-semibold rounded-lg shadow-sm transition-all active:scale-[0.97] disabled:bg-[#21262d] disabled:text-[#8b949e] disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

const Input: React.FC<{ id: string; name: string; type?: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }> = (props) => (
    <input
        {...props}
        className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#21262d] text-[#e6edf3] text-[13px] rounded-lg focus:outline-none focus:border-[#2ee89a] transition-colors placeholder:text-[#484f58]"
    />
);

// --- Page & Flow Components ---

const HomePortal: React.FC<{}> = ({}) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 animate-fade-up">
      <div className="text-center mb-12 flex flex-col items-center">
        <h1 className="text-[32px] sm:text-[42px] font-bold text-[#e6edf3] leading-tight mt-4">
          Welcome <span className="font-pixel text-[12px] sm:text-[16px] text-[#2ee89a] mx-2 inline-block translate-y-[-4px]">to</span> <br />
          <span className="text-[#2ee89a] drop-shadow-[0_0_15px_rgba(46,232,154,0.3)]">NITDA CheckMe</span>
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <div onClick={() => navigate('/admin')} className="bg-[#161b22] p-8 rounded-[14px] border border-[#21262d] cursor-pointer transition-all duration-300 hover:translate-y-[-6px] hover:scale-[1.025] hover:border-[#2ee89a] group relative overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#21262d] flex items-center justify-center mb-6 group-hover:border-[#2ee89a55] transition-colors">
                <AdminIcon className="h-6 w-6 text-[#2ee89a]" />
            </div>
            <h2 className="text-[17px] font-bold text-[#e6edf3] mb-8">Admin Access</h2>
            <div className="flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-[#2ee89a] group-hover:text-[#e6edf3] transition-colors">
              Login to Dashboard <ArrowRightIcon className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
        
        <div onClick={() => navigate('/scan')} className="bg-[#161b22] p-8 rounded-[14px] border border-[#21262d] cursor-pointer transition-all duration-300 hover:translate-y-[-6px] hover:scale-[1.025] hover:border-[#2ee89a] group relative overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#21262d] flex items-center justify-center mb-6 group-hover:border-[#2ee89a55] transition-colors">
                <UserIcon className="h-6 w-6 text-[#2ee89a]" />
            </div>
            <h2 className="text-[17px] font-bold text-[#e6edf3] mb-8">Guest / Entrant</h2>
            <div className="flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-[#2ee89a] group-hover:text-[#e6edf3] transition-colors">
              Scan QR Code <ArrowRightIcon className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </div>
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
                        let hashPath = '';
                        if (code.data.startsWith('#/')) {
                            hashPath = code.data;
                        } else {
                            const url = new URL(code.data);
                            hashPath = url.hash;
                        }

                        if (hashPath && hashPath.startsWith('#/')) {
                            isProcessingRef.current = true;

                            if (animationFrameId.current) {
                                cancelAnimationFrame(animationFrameId.current);
                            }
                            if (videoRef.current && videoRef.current.srcObject) {
                                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                            }

                            const routeWithQuery = hashPath.substring(1);
                            navigate(routeWithQuery);
                            return;
                        }
                    } catch (e) { }
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
                setStatus('error');
                setErrorMessage("Camera access denied. Please enable permissions.");
            }
        };
        startScan();
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
        };
    }, [tick]);

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 animate-fade-up">
            <h2 className="text-[17px] font-bold mb-2 text-center text-[#e6edf3]">Scan QR Code</h2>
            <p className="text-[12px] text-[#8b949e] mb-8 text-center max-w-sm">
                Position the QR code within the frame to automatically check in.
            </p>
            <div className="w-full max-w-md aspect-square bg-[#161b22] border border-[#21262d] rounded-[14px] overflow-hidden relative shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {status === 'scanning' && (
                     <div className="absolute inset-0">
                        {/* Target Frame Corners */}
                        <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-[#2ee89a] rounded-tl-lg"></div>
                        <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-[#2ee89a] rounded-tr-lg"></div>
                        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-[#2ee89a] rounded-bl-lg"></div>
                        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-[#2ee89a] rounded-br-lg"></div>
                        
                        {/* Scanning Line Animation */}
                        <div className="absolute left-8 right-8 top-1/2 h-[1px] bg-[#2ee89a] shadow-[0_0_10px_#2ee89a] animate-pulse"></div>
                     </div>
                )}
                 {status !== 'scanning' && (
                     <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/80">
                        {status === 'idle' && <Spinner />}
                        {(status === 'error' || status === 'no_camera') && (
                             <div className="text-center p-6">
                                <div className="w-12 h-12 rounded-full bg-[#e05c5c]/10 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-[#e05c5c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <p className="text-[#e05c5c] text-[13px] font-medium">{errorMessage}</p>
                            </div>
                        )}
                    </div>
                 )}
            </div>
             <Button onClick={() => navigate('/')} className="mt-8 bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e] active:scale-100">
                Cancel
            </Button>
        </div>
    );
};


const ScanHandler: React.FC<{ mode: 'gate' | 'event' | 'intern'; db: MockDb }> = ({ mode, db }) => {
    const { handleVisitorScan, hasVisitorRegisteredForEvent, getEventById, getLatestLogForVisitor, isReady } = db;
    const navigate = useNavigate();
    const { eventId } = useParams();
    const location = useLocation();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState('');
    const processingRef = useRef(false);

    useEffect(() => {
        const processScan = async () => {
            if (processingRef.current || !isReady) return;
            processingRef.current = true;
            
            // Intern QR code validation
            if (mode === 'intern') {
                const queryParams = new URLSearchParams(location.search);
                const ts = queryParams.get('ts');
                // Strict 7 second validity window for rotated QR codes (3s rotation + 4s buffer)
                if (!ts || Date.now() - parseInt(ts, 10) > 7000) { 
                    setStatus('error');
                    setMessage('QR Code Expired');
                    setDetails('This QR code has expired for security reasons. Please ask the admin for the current code.');
                    return;
                }
            }

            const visitorId = localStorage.getItem(VISITOR_ID_KEY);

            // Fetch details for existing visitors to see if they need registration
            let visitorDetails = null;
            if (visitorId) {
                visitorDetails = await getLatestLogForVisitor(visitorId);
            }

            // If it's a new visitor (no ID) or they have an "Unknown" name (first time scan without registration), they must register.
            if (!visitorId || !visitorDetails || visitorDetails.name === 'Unknown') {
                if (mode === 'gate') navigate('/visitor/register');
                else if (mode === 'intern') navigate('/intern/register');
                else navigate(`/event/${eventId}/register`); // mode === 'event'
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
            
            // Gate and Intern logic
            if (mode === 'gate' || mode === 'intern') {
                try {
                    const result = await handleVisitorScan(visitorId, undefined, mode);
                    setStatus('success');
                    
                    if (mode === 'intern') {
                        if (result.action === 'attended') {
                            setMessage('Attendance Marked!');
                            setDetails(`Thank you, ${result.log.name}. Your attendance for today has been recorded.`);
                        } else if (result.action === 'already_attended') {
                            setMessage('Already Marked Attended');
                            setDetails(`Welcome back, ${result.log.name}. You have already marked your attendance for today.`);
                        }
                    } else { // mode === 'gate'
                        const actionText = result.action === 'checkin' ? 'Checked In' : 'Checked Out';
                        const detailText = `Welcome back, ${result.log.name}. Your status has been updated.`;
                        
                        setMessage(`${actionText} Successfully!`);
                        setDetails(detailText);
                    }

                } catch (error) {
                    setStatus('error');
                    setMessage('An Error Occurred');
                    setDetails('Could not process your request. Please try again or contact an administrator.');
                }
            }
        };

        if (status === 'processing' && isReady) {
            processScan();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, eventId, mode, navigate, location.search, handleVisitorScan, hasVisitorRegisteredForEvent, getEventById, getLatestLogForVisitor, isReady]);
    
    if (status === 'processing') {
        return <div className="flex flex-col items-center justify-center min-h-[85vh] animate-fade-up"><Spinner /><p className="mt-4 text-[13px] text-[#8b949e]">Processing your scan...</p></div>;
    }

    const state: 'success' | 'warning' | 'danger' = status === 'success' ? 'success' : 'danger';
    const characterState: 'success' | 'warning' | 'danger' = 
        message === 'Already Marked Attended' || message === "You're All Set!" ? 'warning' :
        status === 'success' ? 'success' : 'danger';

    const badges = {
        success: 'bg-[#2ee89a11] text-[#2ee89a]',
        warning: 'bg-[#f0a50011] text-[#f0a500]',
        danger: 'bg-[#e05c5c11] text-[#e05c5c]'
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center p-4 animate-fade-up">
            <Character state={characterState} />
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 ${badges[characterState]}`}>
                {message === 'QR Code Expired' ? 'QR Expired' : characterState === 'warning' ? 'Already Here' : 'Checked In'}
            </div>
            <h1 className="text-[20px] font-bold mb-2 text-[#e6edf3]">{message === 'Attendance Marked!' ? `Welcome, ${details.split(', ')[1]?.split('.')[0]}!` : message}</h1>
            <p className="text-[12px] text-[#8b949e] max-w-[280px] leading-relaxed">{details}</p>
            <Button onClick={() => navigate('/')} className="mt-10 bg-[#161b22] border border-[#21262d] text-[#e6edf3] hover:border-[#2ee89a] active:scale-95 transition-all">
                Return to Home
            </Button>
        </div>
    );
};

const AlreadyRegistered: React.FC<{ eventName: string }> = ({ eventName }) => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center p-4 animate-fade-up">
            <Character state="warning" />
            <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-[#f0a50011] text-[#f0a500]">
                Already Registered
            </div>
            <h1 className="text-[20px] font-bold mb-2 text-[#e6edf3]">You're on the list!</h1>
            <p className="text-[12px] text-[#8b949e] max-w-[280px]">You have already registered for <span className="text-[#f0a500] font-medium">{eventName}</span>. No further action is needed.</p>
            <Button onClick={() => navigate('/')} className="mt-10 bg-[#161b22] border border-[#21262d] text-[#e6edf3] hover:border-[#2ee89a]">
                Go to Home
            </Button>
        </div>
    );
};

const RegistrationForm: React.FC<{ mode: 'gate' | 'event' | 'intern'; db: MockDb }> = ({ mode, db }) => {
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
        
        if (mode === 'event') {
            for (const field of eventCustomFields) {
                if (field.required && !customFormData[field.id]?.trim()) {
                    alert(`Please fill out the required field: "${field.label}"`);
                    return;
                }
            }
        }
        
        setIsLoading(true);
        try {
            const existingVisitorId = localStorage.getItem(VISITOR_ID_KEY);
            // Ensure registerNewVisitor finishes or fails with alert
            const result = await registerNewVisitor(
                formData, 
                eventId, 
                existingVisitorId, 
                customFormData,
                mode === 'event' ? 'event' : (mode === 'intern' ? 'intern' : 'gate')
            );
            
            if (!result || !result.visitorId) {
                throw new Error("Registration succeeded but no ID was returned.");
            }

            // If it was a new visitor, set their ID in storage for future visits.
            if (!existingVisitorId) {
                localStorage.setItem(VISITOR_ID_KEY, result.visitorId);
            }
            navigate('/register/success', { state: { mode } });
        } catch (error) {
            console.error('Registration failed:', error);
            alert("Registration failed. Please check your internet connection and try again.");
            setIsLoading(false);
        }
    };

    if (alreadyRegistered === null && mode === 'event') {
        return <div className="flex flex-col items-center justify-center min-h-[80vh]"><Spinner /><p className="mt-4 text-lg">Checking registration status...</p></div>;
    }

    if (alreadyRegistered) {
        return <AlreadyRegistered eventName={eventName} />;
    }

    const isGate = mode === 'gate';
    const isIntern = mode === 'intern';
    const isEvent = mode === 'event';

    const titles = {
        gate: 'Visitor Registration',
        event: 'Event Attendance',
        intern: 'Intern Attendance'
    };
    
    const visitorTypes = {
        [VisitorType.CORPER]: 'NYSC Corper',
        [VisitorType.SIWES]: 'SIWES / IT',
        [VisitorType.STAFF]: 'Staff',
        [VisitorType.GUEST]: 'Guest',
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 animate-fade-up">
            <Card className="w-full max-w-md">
                <div className="p-8">
                    <h2 className="text-[17px] font-bold text-center mb-2 text-[#e6edf3]">
                        {titles[mode]}
                    </h2>
                    {eventName && <p className="text-center text-[#2ee89a] mb-8 text-[13px] font-medium opacity-80">{eventName}</p>}
                    {!eventName && isEvent && <div className="text-center mb-8"><Spinner /></div>}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">Full Name</label>
                            <Input id="name" name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
                        </div>
                        
                        {isGate && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">Department</label>
                                    <Input id="department" name="department" placeholder="Legal, Engineering..." value={formData.department} onChange={handleChange} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">Laptop Model</label>
                                        <Input id="laptopName" name="laptopName" placeholder="MacBook, HP..." value={formData.laptopName} onChange={handleChange} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">Color</label>
                                        <Input id="laptopColor" name="laptopColor" placeholder="Silver, Black..." value={formData.laptopColor} onChange={handleChange} required />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">Serial Number</label>
                                    <Input id="serialNumber" name="serialNumber" placeholder="S/N 123456" value={formData.serialNumber} onChange={handleChange} required />
                                </div>
                                
                                <div className="space-y-3 pt-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">
                                        Visitor Type
                                    </label>
                                    <div className="flex flex-wrap gap-4 pt-1">
                                        {Object.values(VisitorType).map((type) => (
                                            <label key={type} className="flex items-center group cursor-pointer">
                                                <input
                                                    name="visitorType"
                                                    type="radio"
                                                    value={type}
                                                    checked={formData.visitorType === type}
                                                    onChange={handleChange}
                                                    required
                                                    className="hidden"
                                                />
                                                <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${formData.visitorType === type ? 'bg-[#2ee89a] border-[#2ee89a] text-[#0d1117]' : 'bg-transparent border-[#21262d] text-[#8b949e] hover:border-[#484f58]'}`}>
                                                    {type}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        
                        {isIntern && (
                            <div className="space-y-3 pt-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">
                                    Your Role / Type
                                </label>
                                <div className="flex flex-wrap gap-4 pt-1">
                                    {Object.entries(visitorTypes).map(([key, label]) => (
                                        <label key={key} className="flex items-center group cursor-pointer">
                                            <input
                                                name="visitorType"
                                                type="radio"
                                                value={key}
                                                checked={formData.visitorType === key}
                                                onChange={handleChange}
                                                required
                                                className="hidden"
                                            />
                                            <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${formData.visitorType === key ? 'bg-[#2ee89a] border-[#2ee89a] text-[#0d1117]' : 'bg-transparent border-[#21262d] text-[#8b949e] hover:border-[#484f58]'}`}>
                                                {label}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isEvent && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">Organization</label>
                                    <Input id="organization" name="organization" placeholder="Company Name" value={formData.organization} onChange={handleChange} required />
                                </div>

                                {eventCustomFields.map(field => (
                                    <div key={field.id} className="space-y-2 pt-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#484f58] ml-1">
                                            {field.label}
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
                                            <div className="flex flex-wrap gap-3 pt-1">
                                                {field.options.map((option, index) => (
                                                    <label key={index} className="flex items-center group cursor-pointer">
                                                        <input
                                                            name={field.id}
                                                            type="radio"
                                                            value={option}
                                                            checked={customFormData[field.id] === option}
                                                            onChange={handleCustomFieldChange}
                                                            required={field.required}
                                                            className="hidden"
                                                        />
                                                        <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${customFormData[field.id] === option ? 'bg-[#2ee89a] border-[#2ee89a] text-[#0d1117]' : 'bg-transparent border-[#21262d] text-[#8b949e]'}`}>
                                                            {option}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                        
                        <Button type="submit" disabled={isLoading} className="w-full !mt-10">
                            {isLoading ? <Spinner /> : isEvent ? 'Submit Attendance' : 'Submit & Check In'}
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

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center p-4 animate-fade-up">
            <Character state="success" />
            <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-[#2ee89a11] text-[#2ee89a]">
                Success
            </div>
            <h1 className="text-[20px] font-bold mb-2 text-[#e6edf3]">Registration Complete!</h1>
            <p className="text-[12px] text-[#8b949e] max-w-[280px]">Your identity has been verified. Welcome to NITDA HQ!</p>
            <Button onClick={() => navigate('/')} className="mt-10 bg-[#161b22] border border-[#21262d] text-[#e6edf3] hover:border-[#2ee89a]">
                Go to Home
            </Button>
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
        if (username === 'admin' && password === 'password') {
            localStorage.setItem(ADMIN_AUTH_KEY, 'true');
            onLogin();
            navigate('/admin/dashboard');
        } else {
            setError('Invalid credentials.');
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 animate-fade-up">
            <Card className="w-full max-w-[340px]">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 rounded-full border border-[#2ee89a33] flex items-center justify-center mx-auto mb-4 bg-[#2ee89a05]">
                            <AdminIcon className="w-5 h-5 text-[#2ee89a]" />
                        </div>
                        <h2 className="text-[17px] font-bold text-[#e6edf3]">Admin Login</h2>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input id="username" name="username" type="text" placeholder="Admin Name" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        <Input id="password" name="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        {error && <p className="text-[#e05c5c] text-[11px] font-medium text-center">{error}</p>}
                        <Button type="submit" className="w-full !mt-6">
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
        <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
            {fields.length === 0 && (
                <div className="text-center py-12 border border-dashed border-[#21262d] rounded-2xl">
                    <p className="text-[#484f58] text-[13px]">No custom fields added yet.</p>
                </div>
            )}
            {fields.map(field => (
                <div key={field.id} className="p-5 bg-[#161b22] border border-[#21262d] rounded-2xl space-y-4 animate-fade-up">
                    <div className="flex items-center gap-3">
                        <div className="flex-grow">
                            <Input
                                placeholder="Field Label (e.g., Phone Number)"
                                value={field.label}
                                onChange={(e) => updateField(field.id, 'label', e.target.value)}
                            />
                        </div>
                        <button onClick={() => removeField(field.id)} className="p-2 text-[#484f58] hover:text-[#e05c5c] transition-colors">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                     <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#484f58]">{field.type} Field</span>
                         <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-8 h-4 rounded-full transition-colors ${field.required ? 'bg-[#2ee89a33]' : 'bg-[#21262d]'}`}></div>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${field.required ? 'translate-x-4 bg-[#2ee89a]' : 'bg-[#484f58]'}`}></div>
                            </div>
                            <span className="text-[11px] text-[#8b949e] group-hover:text-[#e6edf3] transition-colors">Required</span>
                        </label>
                    </div>
                    {field.type === 'radio' && (
                        <div className="pl-4 border-l-2 border-[#21262d] space-y-3 mt-4">
                            {field.options?.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                     <Input
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) => updateOption(field.id, index, e.target.value)}
                                        className="!py-1.5 !text-[12px]"
                                    />
                                    <button onClick={() => removeOption(field.id, index)} className="p-1 text-[#484f58] hover:text-[#e05c5c]">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => addOption(field.id)} className="text-[11px] font-bold text-[#2ee89a] hover:opacity-80 transition-opacity pl-1">
                                + Add Option
                            </button>
                        </div>
                    )}
                </div>
            ))}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#21262d]">
                <Button onClick={() => addField('text')} className="bg-[#161b22] border border-[#21262d] text-[#e6edf3] hover:border-[#2ee89a] !text-[11px]">
                    + Text Field
                </Button>
                <Button onClick={() => addField('radio')} className="bg-[#161b22] border border-[#21262d] text-[#e6edf3] hover:border-[#2ee89a] !text-[11px]">
                    + Radio Field
                </Button>
            </div>
        </div>
    );
};


const StatusBadge: React.FC<{ status: VisitorStatus | string }> = ({ status }) => {
    const isIn = status === 'in' || status === VisitorStatus.IN;
    const isOut = status === 'out' || status === VisitorStatus.OUT;
    const isAttended = status === 'attended' || status === VisitorStatus.ATTENDED;
    const isRegistered = status === 'registered' || status === VisitorStatus.REGISTERED;

    const colors = isIn 
        ? 'bg-[#2ee89a11] text-[#2ee89a] border border-[#2ee89a22]' 
        : isAttended
        ? 'bg-[#2ee89a22] text-[#2ee89a] border border-[#2ee89a44]'
        : isRegistered
        ? 'bg-[#f0a50011] text-[#f0a500] border border-[#f0a50022]'
        : 'bg-[#161b22] text-[#484f58] border border-[#21262d]';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${colors}`}>
            {status}
        </span>
    );
};

const QRCard: React.FC<{ 
    title: string, 
    description: string, 
    qrUrl: string, 
    onRefresh?: () => void, 
    onRegenerate?: () => void,
    isIntern?: boolean, 
    isRotating?: boolean,
    onDownload: () => void, 
    onView: () => void 
}> = ({ title, description, qrUrl, onRefresh, onRegenerate, isIntern, isRotating, onDownload, onView }) => (
    <Card className="p-8 flex flex-col items-center group hover:border-[#2ee89a33] transition-all">
        <h3 className="text-[15px] font-bold mb-1 text-[#e6edf3]">{title}</h3>
        <p className="text-[12px] text-[#8b949e] mb-8 text-center">{description}</p>
        <div 
            className="bg-white p-6 rounded-2xl mb-8 shadow-2xl shadow-[#2ee89a0a] cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={onView}
        >
            <img key={isIntern || isRotating ? qrUrl : 'static'} src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="QR" />
        </div>
        <div className="flex gap-3 w-full mt-auto">
            {(onRefresh || onRegenerate) && (
                <Button onClick={onRefresh || onRegenerate} className="flex-1 bg-[#161b22] border border-[#21262d] text-[#e6edf3] hover:border-[#2ee89a] !px-2">
                    <RefreshIcon className="w-4 h-4 mr-2" />New
                </Button>
            )}
            <Button onClick={onDownload} className="flex-1 !px-2">
                <DownloadIcon className="w-4 h-4 mr-2" />PNG
            </Button>
        </div>
    </Card>
);

const VisitorLogsTable: React.FC<{ 
    logs: VisitorLog[]; 
    title: string; 
    onEdit?: (log: VisitorLog) => void; 
    onDownload: () => void;
    isLoading?: boolean;
    onRefresh?: () => void;
    onManualEntry?: () => void;
    view?: 'logs' | 'interns';
    internViewType?: 'daily' | 'report';
    setInternViewType?: (type: 'daily' | 'report') => void;
    filter?: 'ALL' | 'IN' | 'OUT';
    setFilter?: (filter: 'ALL' | 'IN' | 'OUT') => void;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    reportMonth?: number;
    setReportMonth?: (month: number) => void;
    reportYear?: number;
    setReportYear?: (year: number) => void;
    reportData?: any[];
}> = ({ 
    logs, title, onEdit, onDownload, isLoading, onRefresh, onManualEntry,
    view = 'logs', internViewType = 'daily', setInternViewType,
    filter, setFilter, searchQuery, setSearchQuery,
    reportMonth, setReportMonth, reportYear, setReportYear,
    reportData = [] 
}) => {
    return (
        <Card className="overflow-hidden border-[#21262d]">
            <div className="p-6 border-b border-[#21262d] flex flex-wrap items-center justify-between bg-[#161b22]/30 gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-[14px] font-bold text-[#e6edf3]">{title}</h3>
                    {view === 'interns' && setInternViewType && (
                        <div className="flex bg-[#0d1117] rounded-lg p-1 border border-[#21262d]">
                            <button 
                                onClick={() => setInternViewType('daily')}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${internViewType === 'daily' ? 'bg-[#21262d] text-[#2ee89a]' : 'text-[#484f58] hover:text-[#8b949e]'}`}
                            >
                                Daily
                            </button>
                            <button 
                                onClick={() => setInternViewType('report')}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${internViewType === 'report' ? 'bg-[#21262d] text-[#2ee89a]' : 'text-[#484f58] hover:text-[#8b949e]'}`}
                            >
                                Report
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filters & Search */}
                    {view === 'logs' && setFilter && (
                        <div className="flex bg-[#0d1117] rounded-lg p-1 border border-[#21262d]">
                            {['ALL', 'IN', 'OUT'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as any)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${filter === f ? 'bg-[#21262d] text-[#2ee89a]' : 'text-[#484f58] hover:text-[#8b949e]'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {view === 'interns' && internViewType === 'report' && setReportMonth && setReportYear && (
                        <div className="flex gap-2">
                             <select 
                                value={reportMonth} 
                                onChange={(e) => setReportMonth(parseInt(e.target.value))}
                                className="bg-[#0d1117] border border-[#21262d] text-[#e6edf3] text-[11px] font-bold rounded-lg px-2 py-1 outline-none"
                            >
                                {Array.from({length: 12}, (_, i) => (
                                    <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select 
                                value={reportYear} 
                                onChange={(e) => setReportYear(parseInt(e.target.value))}
                                className="bg-[#0d1117] border border-[#21262d] text-[#e6edf3] text-[11px] font-bold rounded-lg px-2 py-1 outline-none"
                            >
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery?.(e.target.value)}
                            className="bg-[#0d1117] border border-[#21262d] text-[#e6edf3] text-[12px] rounded-lg pl-9 pr-4 py-1.5 w-40 focus:outline-none focus:border-[#2ee89a/40] transition-colors"
                        />
                    </div>

                    <button onClick={onRefresh} className="p-2 rounded-lg border border-[#21262d] text-[#8b949e] hover:border-[#2ee89a] hover:text-[#2ee89a] transition-all">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    
                    <button onClick={onDownload} className="p-2 rounded-lg border border-[#21262d] text-[#8b949e] hover:border-[#2ee89a] hover:text-[#2ee89a] transition-all">
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    
                    {onManualEntry && (
                        <Button onClick={onManualEntry} className="!py-1.5 !px-4 !text-[12px]">
                            <PlusIcon className="w-4 h-4 mr-2" /> Add Entry
                        </Button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                {view === 'interns' && internViewType === 'report' ? (
                    <table className="w-full text-left">
                         <thead>
                            <tr className="border-b border-[#21262d] bg-[#0d1117]/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Intern Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Attended</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Expected</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Score</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58] w-48">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#21262d]">
                            {reportData.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-[#484f58] text-[13px]">No data for select period.</td></tr>
                            ) : (
                                reportData.map((data, idx) => (
                                    <tr key={idx} className="hover:bg-[#21262d33] transition-colors">
                                        <td className="px-6 py-4 text-[13px] font-semibold text-[#e6edf3]">{data.name}</td>
                                        <td className="px-6 py-4 text-[12px] text-[#e6edf3] font-bold">{data.attended}</td>
                                        <td className="px-6 py-4 text-[12px] text-[#484f58]">{data.expected}</td>
                                        <td className="px-6 py-4 text-[12px] text-[#2ee89a] font-mono">{data.percentage}%</td>
                                        <td className="px-6 py-4">
                                            <div className="w-full bg-[#21262d] rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${data.percentage >= 75 ? 'bg-[#2ee89a]' : data.percentage >= 50 ? 'bg-[#f0a500]' : 'bg-[#e05c5c]'}`} 
                                                    style={{ width: `${data.percentage}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#21262d] bg-[#0d1117]/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Visitor</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Department</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Time</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#484f58] text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#21262d]">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center"><Spinner /></td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-[#484f58] text-[13px]">No logs recorded yet.</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[#21262d33] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-[#161b22] border border-[#21262d] flex items-center justify-center mr-3 group-hover:border-[#2ee89a55] transition-colors">
                                                    <span className="text-[11px] font-bold text-[#2ee89a]">{log.name.charAt(0)}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-semibold text-[#e6edf3]">{log.name}</span>
                                                    <span className="text-[10px] text-[#484f58] font-mono">{log.laptopName || log.organization || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[12px] text-[#8b949e]">{log.visitorType}</td>
                                        <td className="px-6 py-4 text-[12px] text-[#8b949e]">{log.department || '-'}</td>
                                        <td className="px-6 py-4 text-[12px] text-[#8b949e] font-mono">
                                            {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <StatusBadge status={log.status} />
                                            {onEdit && (
                                                <button onClick={() => onEdit(log)} className="ml-3 p-1.5 rounded-lg text-[#484f58] hover:text-[#2ee89a] hover:bg-[#2ee89a11] transition-all opacity-0 group-hover:opacity-100">
                                                    <EditIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
    );
};

const AdminDashboard: React.FC<{ onLogout: () => void; db: MockDb }> = ({ onLogout, db }) => {
    const { 
        visitorLogs: dbLogs, 
        events: dbEvents, 
        stats: dbStats,
        getVisitorLogs, getStats, createEvent, getEvents, addManualVisitorLog, updateVisitorLog 
    } = db;
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'logs' | 'interns' | 'qr' | 'events'>('logs');
    const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [internViewType, setInternViewType] = useState<'daily' | 'report'>('daily');
    const [reportMonth, setReportMonth] = useState(new Date().getMonth());
    const [reportYear, setReportYear] = useState(new Date().getFullYear());

    const [isGateQrModalOpen, setIsGateQrModalOpen] = useState(false);
    const [isInternQrModalOpen, setIsInternQrModalOpen] = useState(false);
    const [isConfirmingGateQR, setIsConfirmingGateQR] = useState(false);
    const [gateQRKey, setGateQRKey] = useState(() => Date.now().toString());
    const [selectedEventForQR, setSelectedEventForQR] = useState<Event | null>(null);
    const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<Event | null>(null);
    const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
    const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [customFields, setCustomFields] = useState<FormField[]>([]);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);

    const logs = dbLogs || [];
    const events = dbEvents || [];
    const stats = dbStats || { currentlyIn: 0, totalVisitorsToday: 0, totalEvents: 0 };

    // Manual Entry state
    const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
    const [manualEntryData, setManualEntryData] = useState({
        name: '',
        department: '',
        visitorType: VisitorType.CORPER,
        laptopName: '',
        laptopColor: '',
        serialNumber: '',
        checkIn: new Date().toISOString().slice(0, 16),
        checkOut: ''
    });
    const [isSubmittingManualEntry, setIsSubmittingManualEntry] = useState(false);

    // Edit Log state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<VisitorLog | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        department: '',
        visitorType: VisitorType.CORPER,
        laptopName: '',
        laptopColor: '',
        serialNumber: ''
    });
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([getVisitorLogs(), getEvents(), getStats()]);
        } catch (error) {
            setToastMessage('Error refreshing data');
        } finally {
            setIsLoading(false);
        }
    }, [getVisitorLogs, getEvents, getStats]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleCreateEvent = async () => {
        if (!newEventName.trim()) return;
        if (customFields.length === 0) {
            setToastMessage('Please add at least one field');
            return;
        }
        setIsCreatingEvent(true);
        try {
            const newEvent = await createEvent(newEventName, customFields);
            setNewEventName('');
            setCustomFields([]);
            setIsCustomFieldsModalOpen(false);
            setToastMessage('Event created successfully!');
            setSelectedEventForQR(newEvent);
        } catch (error) {
            setToastMessage('Error creating event');
        } finally {
            setIsCreatingEvent(false);
        }
    };

    const confirmRecreateGateQR = () => {
        setGateQRKey(Date.now().toString());
        setIsConfirmingGateQR(false);
        setToastMessage('Main gate QR code refreshed');
    };

    const handleManualEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setManualEntryData(prev => ({ ...prev, [name]: value as any }));
    };

    const handleManualEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingManualEntry(true);
        try {
            const checkInMs = new Date(manualEntryData.checkIn).getTime();
            const checkOutMs = manualEntryData.checkOut ? new Date(manualEntryData.checkOut).getTime() : undefined;
            
            await addManualVisitorLog({
                ...manualEntryData,
                checkIn: checkInMs,
                checkOut: checkOutMs
            });
            
            setToastMessage('Manual entry added successfully');
            setIsManualEntryModalOpen(false);
            setManualEntryData({
                name: '',
                department: '',
                visitorType: VisitorType.CORPER,
                laptopName: '',
                laptopColor: '',
                serialNumber: '',
                checkIn: new Date().toISOString().slice(0, 16),
                checkOut: ''
            });
            refreshData();
        } catch (error) {
            setToastMessage('Error adding manual entry');
        } finally {
            setIsSubmittingManualEntry(false);
        }
    };

    const handleOpenEditModal = (log: VisitorLog) => {
        setEditingLog(log);
        setEditFormData({
            name: log.name,
            department: log.department || '',
            visitorType: log.visitorType || VisitorType.CORPER,
            laptopName: log.laptopName || '',
            laptopColor: log.laptopColor || '',
            serialNumber: log.serialNumber || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value as any }));
    };

    const handleUpdateLogSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLog) return;
        setIsSubmittingEdit(true);
        try {
            await updateVisitorLog(editingLog.id, {
                name: editFormData.name,
                department: editFormData.department,
                laptopName: editFormData.laptopName,
                laptopColor: editFormData.laptopColor,
                serialNumber: editFormData.serialNumber,
                visitorType: editFormData.visitorType,
            });
            setToastMessage('Log updated successfully');
            setIsEditModalOpen(false);
            refreshData();
        } catch (error) {
            setToastMessage('Error updating log');
        } finally {
            setIsSubmittingEdit(false);
        }
    };


    const gateQRUrl = `${getBaseQRUrl()}#/gate?v=${gateQRKey}`;

    const handleDownloadGenericQR = async (url: string, baseFilename: string) => {
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(url)}`;
        
        try {
            const response = await fetch(qrApiUrl);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `${baseFilename}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } catch (error) {
            console.error("Failed to download QR code", error);
            setToastMessage("Failed to download QR code.");
        }
    };

    const handleDownloadLogs = (logsToDownload: VisitorLog[], type: string) => {
        const headers = ["Name", "Department", "Visitor Type", "Laptop", "Serial", "Time", "Status"];
        const csvContent = [
            headers.join(','),
            ...logsToDownload.map(log => [
                log.name,
                log.department || '',
                log.visitorType || '',
                log.laptopName || log.organization || '',
                log.serialNumber || '',
                new Date(log.checkIn).toLocaleString(),
                log.status
            ].map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `NITDA_${type}_Logs_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAttendees = () => {
        if (!selectedEventForAttendees) return;
        const eventLogs = logs.filter(l => l.eventId === selectedEventForAttendees.id);
        const headers = ["Name", "Organization", ...(selectedEventForAttendees.customFields?.map(f => f.label) || []), "Registration Time"];
        const csvContent = [
            headers.join(','),
            ...eventLogs.map(log => [
                log.name,
                log.organization || '',
                ...(selectedEventForAttendees.customFields?.map(f => log.customData?.[f.id] || '') || []),
                new Date(log.checkIn).toLocaleString()
            ].map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Event_${selectedEventForAttendees.name.replace(/\s+/g, '_')}_Attendees.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [internQRTimestamp, setInternQRTimestamp] = useState(Date.now());
    const internQRUrl = `${getBaseQRUrl()}#/intern-attendance?ts=${internQRTimestamp}`;

    useEffect(() => {
        const interval = setInterval(() => {
            setInternQRTimestamp(Date.now());
        }, 3000);
        return () => clearInterval(interval);
    }, []);


    const filteredLogs = useMemo(() => {
        return logs
            .filter(l => l.context === 'gate')
            .filter(l => filter === 'ALL' || l.status === filter.toLowerCase())
            .filter(l => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return l.name.toLowerCase().includes(q) || 
                       (l.laptopName?.toLowerCase().includes(q)) || 
                       (l.serialNumber?.toLowerCase().includes(q)) ||
                       (l.department?.toLowerCase().includes(q));
            });
    }, [logs, filter, searchQuery]);

    const filteredInternLogs = useMemo(() => {
        return logs
            .filter(l => l.context === 'intern')
            .filter(l => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return l.name.toLowerCase().includes(q) || (l.department?.toLowerCase().includes(q));
            });
    }, [logs, searchQuery]);

    const internReportData = useMemo(() => {
        const internLogs = logs.filter(l => l.context === 'intern');
        const monthLogs = internLogs.filter(l => {
            const date = new Date(l.checkIn);
            return date.getMonth() === reportMonth && date.getFullYear() === reportYear;
        });

        const internsMap = new Map<string, { name: string, type: VisitorType, attendedDays: Set<string> }>();
        
        monthLogs.forEach(l => {
            if (!internsMap.has(l.visitorId)) {
                internsMap.set(l.visitorId, { 
                    name: l.name, 
                    type: l.visitorType || VisitorType.CORPER, 
                    attendedDays: new Set() 
                });
            }
            const dateKey = new Date(l.checkIn).toDateString();
            internsMap.get(l.visitorId)?.attendedDays.add(dateKey);
        });

        const totalDaysInMonth = new Date(reportYear, reportMonth + 1, 0).getDate();
        const weeksCount = totalDaysInMonth / 7;
        const expectedDays = Math.ceil(weeksCount * 3); // 3 days per week

        return Array.from(internsMap.values()).map(data => {
            const attendedCount = data.attendedDays.size;
            const percentage = Math.min(100, Math.round((attendedCount / expectedDays) * 100));
            return {
                name: data.name,
                type: data.type,
                attended: attendedCount,
                expected: expectedDays,
                percentage
            };
        }).sort((a, b) => b.percentage - a.percentage);
    }, [logs, reportMonth, reportYear]);

    const openQrModal = (event: Event) => setSelectedEventForQR(event);
    const closeQrModal = () => setSelectedEventForQR(null);
    const openGateQrModal = () => setIsGateQrModalOpen(true);
    const closeGateQrModal = () => setIsGateQrModalOpen(false);
    const openInternQrModal = () => setIsInternQrModalOpen(true);
    const closeInternQrModal = () => setIsInternQrModalOpen(false);
    const openAttendeesModal = (event: Event) => {
        setSelectedEventForAttendees(event);
        setAttendeeSearchQuery('');
    };
    const closeAttendeesModal = () => setSelectedEventForAttendees(null);

    const handleDownloadEventQR = async () => {
        if (!selectedEventForQR) return;
        const eventUrl = `${getBaseQRUrl()}#/event/${selectedEventForQR.id}`;
        const fileName = `QR_${selectedEventForQR.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        handleDownloadGenericQR(eventUrl, fileName);
    };
    
    return (
        <div className="relative min-h-screen pt-20 pb-12 px-4 sm:px-6 z-10">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#e6edf3]">Admin Dashboard</h1>
                        <p className="text-[#8b949e] mt-1">Manage NITDA visitors, interns and events</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={refreshData}
                            className="bg-[#161b22] border-[#21262d] text-[#e6edf3] hover:bg-[#21262d]"
                        >
                            <RefreshIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            onClick={onLogout}
                            className="bg-[#e05c5c] hover:bg-[#e05c5c]/90 text-white border-0"
                        >
                            <LogoutIcon className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-[#161b22] border-[#21262d] p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <UserIcon className="w-16 h-16 text-[#2ee89a]" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">Currently In</p>
                            <h2 className="text-4xl font-bold text-[#e6edf3] mt-2">
                                {stats?.currentlyIn ?? '0'}
                            </h2>
                            <div className="mt-4 flex items-center text-[#2ee89a] text-sm">
                                <span className="flex h-2 w-2 rounded-full bg-[#2ee89a] mr-2 animate-pulse"></span>
                                Live Tracking
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-[#161b22] border-[#21262d] p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <LoginIcon className="w-16 h-16 text-[#2ee89a]" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">Visitors Today</p>
                            <h2 className="text-4xl font-bold text-[#e6edf3] mt-2">
                                {stats?.totalVisitorsToday ?? '0'}
                            </h2>
                            <p className="mt-4 text-[#8b949e] text-sm">
                                Across all categories
                            </p>
                        </div>
                    </Card>

                    <Card className="bg-[#161b22] border-[#21262d] p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <QrCodeIcon className="w-16 h-16 text-[#2ee89a]" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">Total Events</p>
                            <h2 className="text-4xl font-bold text-[#e6edf3] mt-2">
                                {stats?.totalEvents ?? '0'}
                            </h2>
                            <p className="mt-4 text-[#8b949e] text-sm">
                                Active registration portals
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-8 bg-[#161b22]/50 p-1 rounded-xl border border-[#21262d] w-fit">
                    <button
                        onClick={() => setView('logs')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            view === 'logs'
                                ? 'bg-[#2ee89a] text-[#0d1117] shadow-lg shadow-[#2ee89a]/20'
                                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                        }`}
                    >
                        Visitor Logs
                    </button>
                    <button
                        onClick={() => setView('interns')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            view === 'interns'
                                ? 'bg-[#2ee89a] text-[#0d1117] shadow-lg shadow-[#2ee89a]/20'
                                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                        }`}
                    >
                        Interns Attendance
                    </button>
                    <button
                        onClick={() => setView('qr')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            view === 'qr'
                                ? 'bg-[#2ee89a] text-[#0d1117] shadow-lg shadow-[#2ee89a]/20'
                                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                        }`}
                    >
                        QR Management
                    </button>
                    <button
                        onClick={() => setView('events')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            view === 'events'
                                ? 'bg-[#2ee89a] text-[#0d1117] shadow-lg shadow-[#2ee89a]/20'
                                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                        }`}
                    >
                        Event Analytics
                    </button>
                </div>
                    {(view === 'logs' || view === 'interns') && (
                    <VisitorLogsTable
                        title={view === 'logs' ? 'Visitor Activity' : 'Intern Attendance'}
                        view={view}
                        internViewType={internViewType}
                        setInternViewType={setInternViewType}
                        filter={filter}
                        setFilter={setFilter}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        reportMonth={reportMonth}
                        setReportMonth={setReportMonth}
                        reportYear={reportYear}
                        setReportYear={setReportYear}
                        isLoading={isLoading}
                        logs={view === 'logs' ? filteredLogs : filteredInternLogs}
                        reportData={internReportData}
                        onDownload={() => handleDownloadLogs(view === 'logs' ? filteredLogs : filteredInternLogs, view === 'logs' ? 'gate' : 'intern')}
                        onRefresh={refreshData}
                        onManualEntry={() => setIsManualEntryModalOpen(true)}
                        onEdit={handleOpenEditModal}
                    />
                )}

                {view === 'qr' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <QRCard
                            title="Main Gate Access"
                            description="Used for general visitor check-in and check-out tracking."
                            qrUrl={gateQRUrl}
                            onDownload={() => handleDownloadGenericQR(gateQRUrl, 'MainGate_QR')}
                            onRegenerate={() => setIsConfirmingGateQR(true)}
                            onView={() => openGateQrModal()}
                        />
                        <QRCard
                            title="Intern Attendance"
                            description="Dynamic QR code for interns. Auto-rotates for security."
                            qrUrl={internQRUrl}
                            isRotating
                            onDownload={() => handleDownloadGenericQR(internQRUrl, 'InternAttendance_QR')}
                            onView={() => openInternQrModal()}
                        />
                        <Card className="flex flex-col border-[#2ee89a]/20 bg-[#2ee89a]/5 border-dashed">
                            <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                                <div className="w-16 h-16 rounded-full bg-[#2ee89a] flex items-center justify-center mb-6 shadow-lg shadow-[#2ee89a]/20">
                                    <PlusIcon className="w-8 h-8 text-[#0d1117]" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Create Event QR</h3>
                                <p className="text-sm text-[#8b949e] mb-8">
                                    Generate a unique registration form and QR code for specific events and workshops.
                                </p>
                                <Button
                                    className="w-full bg-[#2ee89a] text-[#0d1117] hover:bg-[#2ee89a]/90 font-bold border-0"
                                    onClick={() => setIsCustomFieldsModalOpen(true)}
                                >
                                    Customize & Generate
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {view === 'events' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            <div className="col-span-full flex justify-center py-20">
                                <RefreshIcon className="w-8 h-8 animate-spin text-[#2ee89a]" />
                            </div>
                        ) : events.length > 0 ? (
                            events.map(event => {
                                const eventLogs = logs.filter(log => log.eventId === event.id);
                                const totalAttendees = new Set(eventLogs.map(log => log.visitorId)).size;

                                return (
                                    <Card key={event.id} className="group overflow-hidden border-[#21262d] hover:border-[#2ee89a] transition-all">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-xl font-bold text-[#e6edf3] mb-1 group-hover:text-[#2ee89a] transition-colors">
                                                        {event.name}
                                                    </h3>
                                                    <p className="text-xs text-[#8b949e]">
                                                        Created {new Date(event.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => openQrModal(event)}
                                                    className="p-2 rounded-lg bg-[#21262d] text-[#8b949e] hover:text-[#2ee89a] hover:bg-[#2ee89a]/10 transition-all shadow-sm"
                                                >
                                                    <QrCodeIcon className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="bg-[#0d1117] rounded-xl p-4 border border-[#21262d]">
                                                    <p className="text-2xl font-bold text-[#2ee89a]">{totalAttendees}</p>
                                                    <p className="text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Attendees</p>
                                                </div>
                                                <div className="bg-[#0d1117] rounded-xl p-4 border border-[#21262d]">
                                                    <p className="text-2xl font-bold text-[#e6edf3]">{event.customFields?.length || 0}</p>
                                                    <p className="text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Fields</p>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                className="w-full bg-[#161b22] border-[#21262d] group-hover:border-[#2ee89a]/50"
                                                onClick={() => openAttendeesModal(event)}
                                            >
                                                <UserIcon className="w-4 h-4 mr-2" />
                                                View Attendee List
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-20 bg-[#161b22] rounded-2xl border border-[#21262d] border-dashed">
                                <div className="w-16 h-16 rounded-full bg-[#21262d] flex items-center justify-center mx-auto mb-4">
                                    <PlusIcon className="w-8 h-8 text-[#8b949e]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#e6edf3] mb-2">No Events Found</h3>
                                <p className="text-[#8b949e] max-w-sm mx-auto">
                                    You haven't created any events yet. Head over to the QR Management tab to get started.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Toast message={toastMessage} show={!!toastMessage} />

            {/* Manual Entry Modal */}
            <Modal
                isOpen={isManualEntryModalOpen}
                onClose={() => setIsManualEntryModalOpen(false)}
                title="Add Visitor Manually"
                size="lg"
            >
                <form onSubmit={handleManualEntrySubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Full Name</label>
                            <Input
                                name="name"
                                value={manualEntryData.name}
                                onChange={handleManualEntryChange}
                                placeholder="Enter full name"
                                className="bg-[#0d1117] border-[#21262d] focus:border-[#2ee89a]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Department</label>
                            <Input
                                name="department"
                                value={manualEntryData.department}
                                onChange={handleManualEntryChange}
                                placeholder="Enter department"
                                className="bg-[#0d1117] border-[#21262d] focus:border-[#2ee89a]"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Laptop Brand</label>
                            <Input
                                name="laptopName"
                                value={manualEntryData.laptopName}
                                onChange={handleManualEntryChange}
                                placeholder="e.g. Dell"
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Color</label>
                            <Input
                                name="laptopColor"
                                value={manualEntryData.laptopColor}
                                onChange={handleManualEntryChange}
                                placeholder="e.g. Silver"
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Serial Number</label>
                            <Input
                                name="serialNumber"
                                value={manualEntryData.serialNumber}
                                onChange={handleManualEntryChange}
                                placeholder="S/N 123..."
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#8b949e]">Visitor Type</label>
                        <select
                            name="visitorType"
                            value={manualEntryData.visitorType}
                            onChange={handleManualEntryChange}
                            className="w-full bg-[#0d1117] border-[#21262d] text-[#e6edf3] rounded-lg p-3 outline-none focus:border-[#2ee89a] transition-colors"
                        >
                            {Object.values(VisitorType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Check-in Time</label>
                            <Input
                                type="datetime-local"
                                name="checkIn"
                                value={manualEntryData.checkIn}
                                onChange={handleManualEntryChange}
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Check-out Time (Optional)</label>
                            <Input
                                type="datetime-local"
                                name="checkOut"
                                value={manualEntryData.checkOut}
                                onChange={handleManualEntryChange}
                                className="bg-[#0d1117] border-[#21262d]"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[#21262d]">
                        <Button
                            variant="outline"
                            className="flex-1 bg-[#161b22] border-[#21262d]"
                            onClick={() => setIsManualEntryModalOpen(false)}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-[#2ee89a] text-[#0d1117] hover:bg-[#2ee89a]/90 font-bold border-0"
                            type="submit"
                            disabled={isSubmittingManualEntry}
                        >
                            {isSubmittingManualEntry ? (
                                <RefreshIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                'Save Entry'
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Visitor Information"
                size="lg"
            >
                <form onSubmit={handleUpdateLogSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Full Name</label>
                            <Input
                                name="name"
                                value={editFormData.name}
                                onChange={handleEditFormChange}
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Department</label>
                            <Input
                                name="department"
                                value={editFormData.department}
                                onChange={handleEditFormChange}
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Laptop Brand</label>
                            <Input
                                name="laptopName"
                                value={editFormData.laptopName}
                                onChange={handleEditFormChange}
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Color</label>
                            <Input
                                name="laptopColor"
                                value={editFormData.laptopColor}
                                onChange={handleEditFormChange}
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8b949e]">Serial Number</label>
                            <Input
                                name="serialNumber"
                                value={editFormData.serialNumber}
                                onChange={handleEditFormChange}
                                className="bg-[#0d1117] border-[#21262d]"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#8b949e]">Visitor Type</label>
                        <select
                            name="visitorType"
                            value={editFormData.visitorType}
                            onChange={handleEditFormChange}
                            className="w-full bg-[#0d1117] border-[#21262d] text-[#e6edf3] rounded-lg p-3 outline-none focus:border-[#2ee89a] transition-colors"
                        >
                            {Object.values(VisitorType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[#21262d]">
                        <Button
                            variant="outline"
                            className="flex-1 bg-[#161b22] border-[#21262d]"
                            onClick={() => setIsEditModalOpen(false)}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-[#2ee89a] text-[#0d1117] hover:bg-[#2ee89a]/90 font-bold border-0"
                            type="submit"
                            disabled={isSubmittingEdit}
                        >
                            {isSubmittingEdit ? (
                                <RefreshIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Custom Fields Builder Modal */}
            <Modal
                isOpen={isCustomFieldsModalOpen}
                onClose={() => setIsCustomFieldsModalOpen(false)}
                title="Event Custom Registration Fields"
                size="lg"
            >
                <div className="space-y-6">
                    <p className="text-sm text-[#8b949e]">
                        Define the fields you want to collect during event registration.
                        Enter an event name below to finalize and generate the QR code.
                    </p>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#8b949e]">Event Name</label>
                        <Input
                            placeholder="Enter event name..."
                            value={newEventName}
                            onChange={(e) => setNewEventName(e.target.value)}
                            className="bg-[#0d1117] border-[#21262d]"
                        />
                    </div>

                    <CustomFieldsBuilder fields={customFields} setFields={setCustomFields} />
                    
                    <div className="flex gap-3 pt-6 border-t border-[#21262d]">
                        <Button
                            variant="outline"
                            className="flex-1 bg-[#161b22] border-[#21262d]"
                            onClick={() => setIsCustomFieldsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-[#2ee89a] text-[#0d1117] hover:bg-[#2ee89a]/90 font-bold border-0"
                            onClick={handleCreateEvent}
                            disabled={isLoading}
                        >
                            {isLoading ? <RefreshIcon className="w-4 h-4 animate-spin" /> : 'Create Event QR'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Event QR Modal */}
            <Modal
                isOpen={!!selectedEventForQR}
                onClose={closeQrModal}
                title={selectedEventForQR?.name || 'Gate QR Code'}
            >
                <div className="flex flex-col items-center">
                    <div className="bg-white p-6 rounded-2xl shadow-xl mb-8 border border-[#21262d]">
                        {selectedEventForQR ? (
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                                    `${getBaseQRUrl()}#/event/${selectedEventForQR.id}`
                                )}`}
                                alt="Event QR"
                                className="w-full max-w-[300px]"
                            />
                        ) : (
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(gateQRUrl)}`}
                                alt="Gate QR"
                                className="w-full max-w-[300px]"
                            />
                        )}
                    </div>
                    <div className="flex gap-4 w-full">
                        <Button
                            variant="outline"
                            className="flex-1 bg-[#161b22] border-[#21262d]"
                            onClick={closeQrModal}
                        >
                            Close
                        </Button>
                        <Button
                            className="flex-1 bg-[#2ee89a] text-[#0d1117] hover:bg-[#2ee89a]/90 font-bold border-0"
                            onClick={() => {
                                if (selectedEventForQR) {
                                  handleDownloadEventQR();
                                } else {
                                  handleDownloadGenericQR(gateQRUrl, 'MainGate_QR');
                                }
                            }}
                        >
                            Download
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Intern QR Modal */}
            <Modal
                isOpen={isInternQrModalOpen}
                onClose={closeInternQrModal}
                title="Intern Attendance QR"
            >
                <div className="flex flex-col items-center">
                    <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-[#21262d]">
                        <img
                            key={internQRUrl}
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(internQRUrl)}`}
                            alt="Intern QR"
                            className="w-full max-w-[300px]"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#8b949e] mb-8 bg-[#2ee89a]/5 px-4 py-2 rounded-full border border-[#2ee89a]/20">
                        <RefreshIcon className="w-3 h-3 animate-spin text-[#2ee89a]" />
                        Rotates every 3 seconds for security
                    </div>
                    <div className="flex gap-4 w-full">
                        <Button
                            variant="outline"
                            className="flex-1 bg-[#161b22] border-[#21262d]"
                            onClick={closeInternQrModal}
                        >
                            Close
                        </Button>
                        <Button
                            className="flex-1 bg-[#2ee89a] text-[#0d1117] hover:bg-[#2ee89a]/90 font-bold border-0"
                            onClick={() => handleDownloadGenericQR(internQRUrl, 'InternAttendance_QR')}
                        >
                            Download
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Gate QR Confirm Modal */}
            <Modal
                isOpen={isConfirmingGateQR}
                onClose={() => setIsConfirmingGateQR(false)}
                title="Regenerate Gate QR?"
            >
                <div className="space-y-6">
                    <p className="text-[#8b949e]">
                        This will generate a new security key for the main gate QR code.
                        The old QR code printed on physical banners will still work but the system key will be updated.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 bg-[#161b22] border-[#21262d]"
                            onClick={() => setIsConfirmingGateQR(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-[#2ee89a] text-[#0d1117] hover:bg-[#2ee89a]/90 font-bold border-0"
                            onClick={confirmRecreateGateQR}
                        >
                            Regenerate
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Attendees Modal */}
            <Modal
                isOpen={!!selectedEventForAttendees}
                onClose={closeAttendeesModal}
                title={selectedEventForAttendees?.name ? `Attendees: ${selectedEventForAttendees.name}` : 'Attendees'}
            >
                {selectedEventForAttendees && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full md:w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                                <Input
                                    placeholder="Search attendees..."
                                    value={attendeeSearchQuery}
                                    onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                                    className="pl-10 bg-[#0d1117] border-[#21262d]"
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="w-full md:w-auto bg-[#161b22] border-[#21262d]"
                                onClick={handleDownloadAttendees}
                            >
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                Export List
                            </Button>
                        </div>

                        <div className="max-h-[400px] overflow-auto rounded-xl border border-[#21262d]">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#21262d] sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Organization</th>
                                        {selectedEventForAttendees.customFields?.map(f => (
                                            <th key={f.id} className="px-4 py-3 font-medium">{f.label}</th>
                                        ))}
                                        <th className="px-4 py-3 font-medium text-right">Registered At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.filter(l => l.eventId === selectedEventForAttendees.id).length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-12 text-center text-[#8b949e]">
                                                No attendees have registered yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs
                                            .filter(l => l.eventId === selectedEventForAttendees.id)
                                            .filter(l => {
                                                const q = attendeeSearchQuery.toLowerCase();
                                                return l.name.toLowerCase().includes(q) || (l.organization || '').toLowerCase().includes(q);
                                            })
                                            .map(log => (
                                                <tr key={log.id} className="border-b border-[#21262d] hover:bg-[#161b22]/50 transition-colors">
                                                    <td className="px-4 py-3 text-[#e6edf3] font-medium">{log.name}</td>
                                                    <td className="px-4 py-3 text-[#8b949e]">{log.organization || '—'}</td>
                                                    {selectedEventForAttendees.customFields?.map(f => (
                                                        <td key={f.id} className="px-4 py-3 text-[#8b949e]">{log.customData?.[f.id] || '—'}</td>
                                                    ))}
                                                    <td className="px-4 py-3 text-[#8b949e] text-right">
                                                        {new Date(log.checkIn).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
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
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans selection:bg-[#2ee89a33] selection:text-[#2ee89a]">
      <MeshBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePortal />} />
            <Route path="/scan" element={<QRScannerPage />} />
            <Route path="/gate" element={<ScanHandler mode="gate" db={db} />} />
            <Route path="/visitor/register" element={<RegistrationForm mode="gate" db={db} />} />
            <Route path="/intern-attendance" element={<ScanHandler mode="intern" db={db} />} />
            <Route path="/intern/register" element={<RegistrationForm mode="intern" db={db} />} />
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
    </div>
  );
}

// FIX: Removed custom Navigate component in favor of the official one from react-router-dom.
// The custom component used a useEffect for navigation which is an anti-pattern.


export default App;
