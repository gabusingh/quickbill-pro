
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CustomerDetails, InvoiceItem, Invoice, ItemTemplate } from './types.ts';
import { parseItemsWithAI } from './services/geminiService.ts';
import { 
  PlusIcon, 
  TrashIcon, 
  SparklesIcon, 
  CheckCircleIcon,
  ClockIcon,
  PencilIcon,
  XMarkIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  ArrowUpOnSquareIcon,
  SquaresPlusIcon,
  ArrowDownTrayIcon,
  UserPlusIcon,
  ShoppingBagIcon,
  UserIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  StarIcon
} from '@heroicons/react/24/outline';

type Theme = 'light' | 'dark' | 'system';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const generateInvoiceId = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AG-${year}${month}${day}-${random}`;
};

const DEFAULT_GEMS: ItemTemplate[] = [
  { id: 'g1', particulars: 'Blue Sapphire (Neelam)', weight: 5.25, weightUnit: 'ct', unitPrice: 12500 },
  { id: 'g2', particulars: 'Yellow Sapphire (Pukhraj)', weight: 4.5, weightUnit: 'ct', unitPrice: 15000 },
  { id: 'g3', particulars: 'Emerald (Panna)', weight: 3.2, weightUnit: 'ct', unitPrice: 8000 },
  { id: 'g4', particulars: 'Ruby (Manik)', weight: 6.0, weightUnit: 'ratti', unitPrice: 9500 },
  { id: 'g5', particulars: 'Red Coral (Moonga)', weight: 8.5, weightUnit: 'ratti', unitPrice: 2500 },
  { id: 'g6', particulars: 'Pearl (Moti)', weight: 5.0, weightUnit: 'ct', unitPrice: 3200 },
  { id: 'g7', particulars: 'Hessonite (Gomed)', weight: 7.25, weightUnit: 'ct', unitPrice: 1800 },
  { id: 'g8', particulars: 'Cat\'s Eye (Lehsuniya)', weight: 4.8, weightUnit: 'ct', unitPrice: 4500 }
];

const App: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1); 
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('astro_theme') as Theme) || 'system');
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '', phone: '', email: '', address: ''
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(3); 
  const [isGstEnabled, setIsGstEnabled] = useState<boolean>(true);
  const [aiInput, setAiInput] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([]);
  
  const [customerRegistry, setCustomerRegistry] = useState<CustomerDetails[]>([]);
  const [productRegistry, setProductRegistry] = useState<ItemTemplate[]>([]);
  
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showIosInstallTip, setShowIosInstallTip] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Theme Logic
  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem('astro_theme', theme);
    
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Initialization & PWA
  useEffect(() => {
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos && !isStandalone) {
      const hasSeenTip = localStorage.getItem('has_seen_ios_tip_astro');
      if (!hasSeenTip) setShowIosInstallTip(true);
    }

    // Load History & Registry
    const savedCustomers = localStorage.getItem('astro_customer_registry');
    if (savedCustomers) setCustomerRegistry(JSON.parse(savedCustomers));
    
    const savedProducts = localStorage.getItem('astro_product_registry');
    if (savedProducts) {
      setProductRegistry(JSON.parse(savedProducts));
    } else {
      setProductRegistry(DEFAULT_GEMS);
      localStorage.setItem('astro_product_registry', JSON.stringify(DEFAULT_GEMS));
    }

    const savedHistory = localStorage.getItem('astro_invoice_history');
    if (savedHistory) setInvoiceHistory(JSON.parse(savedHistory));

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const dismissIosTip = () => {
    setShowIosInstallTip(false);
    localStorage.setItem('has_seen_ios_tip_astro', 'true');
  };

  const upsertCustomerToRegistry = (cust: CustomerDetails) => {
    if (!cust.name || !cust.phone) return;
    setCustomerRegistry(prev => {
      const filtered = prev.filter(c => c.phone !== cust.phone);
      const updated = [cust, ...filtered].slice(0, 200);
      localStorage.setItem('astro_customer_registry', JSON.stringify(updated));
      return updated;
    });
  };

  const upsertProductsToRegistry = (newItems: InvoiceItem[]) => {
    setProductRegistry(prev => {
      let updated = [...prev];
      newItems.forEach(item => {
        if (!item.particulars) return;
        updated = updated.filter(p => p.particulars.toLowerCase() !== item.particulars.toLowerCase());
        updated.unshift({
          id: Math.random().toString(36).substr(2, 9),
          particulars: item.particulars,
          weight: item.weight,
          weightUnit: item.weightUnit,
          unitPrice: item.unitPrice
        });
      });
      const trimmed = updated.slice(0, 500);
      localStorage.setItem('astro_product_registry', JSON.stringify(trimmed));
      return trimmed;
    });
  };

  const saveToHistory = useCallback((invoice: Invoice) => {
    setInvoiceHistory(prev => {
      const updated = [invoice, ...prev].slice(0, 100);
      localStorage.setItem('astro_invoice_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const suggestedCustomers = useMemo(() => {
    if (customerSearchTerm.length < 2) return [];
    const term = customerSearchTerm.toLowerCase();
    return customerRegistry.filter(c => 
      c.name.toLowerCase().includes(term) || c.phone.includes(term)
    );
  }, [customerRegistry, customerSearchTerm]);

  const suggestedProducts = useMemo(() => {
    if (itemSearchTerm.length < 2) return [];
    const term = itemSearchTerm.toLowerCase();
    return productRegistry.filter(p => p.particulars.toLowerCase().includes(term));
  }, [productRegistry, itemSearchTerm]);

  const handleNewSession = () => {
    setStep(1);
    setCustomer({ name: '', phone: '', email: '', address: '' });
    setItems([]);
    setCurrentInvoiceId('');
    setSignature(null);
    setAiInput('');
    setItemSearchTerm('');
    setCustomerSearchTerm('');
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      particulars: '', quantity: 1, weight: 0, weightUnit: 'ct', unitPrice: 0, total: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const addFromRegistry = (product: ItemTemplate) => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      particulars: product.particulars,
      quantity: 1,
      weight: product.weight,
      weightUnit: product.weightUnit,
      unitPrice: product.unitPrice,
      total: product.unitPrice
    };
    setItems(prev => [...prev, newItem]);
    setItemSearchTerm('');
  };

  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        const qty = typeof updated.quantity === 'number' ? updated.quantity : 0;
        const price = typeof updated.unitPrice === 'number' ? updated.unitPrice : 0;
        updated.total = qty * price;
        return updated;
      }
      return item;
    }));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = isGstEnabled ? (subtotal * taxRate) / 100 : 0;
    const grandTotal = subtotal + taxAmount;
    return { subtotal, taxAmount, grandTotal };
  }, [items, taxRate, isGstEnabled]);

  const handleFinish = () => {
    const newId = currentInvoiceId || generateInvoiceId();
    setCurrentInvoiceId(newId);
    upsertCustomerToRegistry(customer);
    upsertProductsToRegistry(items);
    const newInvoice: Invoice = {
      id: newId, date: new Date().toLocaleDateString(), customer, items,
      subtotal: totals.subtotal, taxRate, taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal, isGstEnabled, signature: signature || undefined
    };
    saveToHistory(newInvoice);
    setStep(3);
  };

  const handleSmartAdd = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parseItemsWithAI(aiInput);
      const newItems: InvoiceItem[] = parsed.map(p => ({
        id: Math.random().toString(36).substr(2, 9),
        particulars: p.particulars || 'New Gem',
        quantity: p.quantity || 1,
        weight: p.weight || 0,
        weightUnit: p.weightUnit || 'ct',
        unitPrice: p.unitPrice || 0,
        total: (p.quantity || 1) * (p.unitPrice || 0)
      }));
      setItems(prev => [...prev, ...newItems]);
      setAiInput('');
    } finally {
      setIsAiLoading(false);
    }
  };

  const loadDemoData = () => {
    setCustomer({
      name: 'Aditya Vardhan',
      phone: '9820012345',
      email: 'aditya.v@example.com',
      address: '7th Floor, Crystal Tower, Marine Drive, Mumbai, Maharashtra 400020'
    });
    setItems([
      {
        id: 'demo-1',
        particulars: 'Natural Blue Sapphire (Neelam)',
        quantity: 1,
        weight: 5.25,
        weightUnit: 'ct',
        unitPrice: 45000,
        total: 45000
      },
      {
        id: 'demo-2',
        particulars: 'Natural Yellow Sapphire (Pukhraj)',
        quantity: 1,
        weight: 4.5,
        weightUnit: 'ct',
        unitPrice: 38000,
        total: 38000
      }
    ]);
  };

  const handleShare = () => {
    const text = `✨ *AstroGems Pro Bill* ✨\n*Ref:* ${currentInvoiceId}\n*Customer:* ${customer.name}\n*Total:* ${formatINR(totals.grandTotal)}\nThank you for visiting! ✨`;
    const encoded = encodeURIComponent(text);
    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 100);
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      ctx?.beginPath();
      ctx?.moveTo(x, y);
    }
  };
  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = theme === 'light' ? '#475569' : '#a78bfa';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) setSignature(canvas.toDataURL('image/png'));
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-900 flex flex-col max-w-lg mx-auto shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="flex-none bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 no-print pt-[env(safe-area-inset-top,16px)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
             <div className="bg-violet-600 p-2 rounded-xl mr-3 shadow-lg shadow-violet-900/40">
                <StarIcon className="w-5 h-5 text-white" />
             </div>
             <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white brand-font tracking-tight">AstroGems <span className="text-violet-600 dark:text-violet-400">Pro</span></h1>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Premium Billing</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              {theme === 'light' ? <SunIcon className="w-5 h-5" /> : theme === 'dark' ? <MoonIcon className="w-5 h-5" /> : <ComputerDesktopIcon className="w-5 h-5" />}
            </button>
            <button onClick={() => setStep(1)} className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              <ClockIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex justify-between relative no-print px-4">
          <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 dark:bg-slate-800 -z-10 -translate-y-1/2"></div>
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${step === s ? 'bg-violet-600 border-violet-600 text-white scale-110 shadow-lg shadow-violet-900/40' : step > s ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600'}`}>
              {step > s ? <CheckCircleIcon className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto relative scrollbar-hide">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="bg-white dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center brand-font">
                <UserPlusIcon className="w-5 h-5 mr-3 text-violet-600 dark:text-violet-400" />
                Customer Identity
              </h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Name / Phone Search</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={customer.name || customerSearchTerm} 
                      onChange={(e) => {
                        setCustomer({...customer, name: e.target.value});
                        setCustomerSearchTerm(e.target.value);
                      }} 
                      placeholder="Start typing..." 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600" 
                    />
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                  </div>

                  {suggestedCustomers.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto">
                      {suggestedCustomers.map((c) => (
                        <button 
                          key={c.phone} 
                          onClick={() => { setCustomer(c); setCustomerSearchTerm(''); }}
                          className="w-full flex items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-900/50 last:border-0"
                        >
                          <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-xl mr-4 text-violet-600 dark:text-violet-400">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                    <input type="tel" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} placeholder="+91..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                    <input type="email" value={customer.email} onChange={(e) => setCustomer({...customer, email: e.target.value})} placeholder="Optional" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Postal Address</label>
                  <textarea rows={2} value={customer.address} onChange={(e) => setCustomer({...customer, address: e.target.value})} placeholder="Billing location..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-950/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white block">Calculate GST ({taxRate}%)</span>
                  <p className="text-[10px] text-slate-500">Applied on precious gemstones</p>
                </div>
                <button onClick={() => setIsGstEnabled(!isGstEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGstEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isGstEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </section>

            {invoiceHistory.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Recent Invoices</h3>
                <div className="space-y-3">
                  {invoiceHistory.slice(0, 3).map((inv) => (
                    <button key={inv.id} className="w-full bg-white dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-left hover:border-violet-300 dark:hover:border-slate-600 transition-colors" onClick={() => { setCustomer(inv.customer); setItems(inv.items); setStep(3); }}>
                      <div className="flex items-center">
                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl mr-4 text-violet-600 dark:text-violet-400">
                          <MoonIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{inv.customer.name}</p>
                          <p className="text-[10px] text-slate-500">{inv.id} • {inv.date}</p>
                        </div>
                      </div>
                      <p className="font-black text-violet-600 dark:text-violet-400">{formatINR(inv.grandTotal)}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
            
            <button onClick={loadDemoData} className="w-full py-4 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Start with Demo Record</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="flex items-center text-violet-100 mb-4 text-[10px] font-black uppercase tracking-widest">
                <SparklesIcon className="w-4 h-4 mr-2" /> AI Celestial Parsing
              </div>
              <div className="relative">
                <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSmartAdd()} placeholder="e.g. 5ct Blue Sapphire at 12k..." className="w-full pr-24 pl-5 py-4 bg-black/20 border border-white/10 rounded-2xl text-sm placeholder-violet-200 focus:bg-black/30 outline-none text-white transition-all backdrop-blur-sm" />
                <button onClick={handleSmartAdd} disabled={isAiLoading || !aiInput} className="absolute right-2 top-2 bottom-2 px-5 bg-white text-violet-700 rounded-xl text-xs font-black shadow-lg">
                  {isAiLoading ? '...' : 'ADD'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center brand-font">
                  <ShoppingBagIcon className="w-5 h-5 mr-3 text-violet-600 dark:text-violet-400" />
                  Inventory & Gems
                </h2>
                <button onClick={addItem} className="flex items-center text-xs font-black text-violet-600 dark:text-violet-400 bg-violet-600/10 px-4 py-2 rounded-2xl border border-violet-600/20 active:scale-95 transition-transform">
                  <PlusIcon className="w-4 h-4 mr-1.5" /> Manual
                </button>
              </div>

              <div className="relative">
                <div className="relative group">
                  <input type="text" value={itemSearchTerm} onChange={(e) => setItemSearchTerm(e.target.value)} placeholder="Search master gem catalog..." className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none text-sm shadow-sm" />
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                </div>
                
                {suggestedProducts.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto">
                    {suggestedProducts.map((p) => (
                      <button key={p.particulars} onClick={() => addFromRegistry(p)} className="w-full flex justify-between items-center p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-900/50 last:border-0">
                        <div className="flex items-center">
                          <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-xl mr-4 text-violet-600 dark:text-violet-400">
                            <StarIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{p.particulars}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">{p.weight} {p.weightUnit} • Std. Price</p>
                          </div>
                        </div>
                        <p className="font-black text-violet-600 dark:text-violet-400 text-sm">{formatINR(p.unitPrice)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-950/30 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
                  <ShoppingBagIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold opacity-60">Your bill is empty</p>
                </div>
              ) : (
                <div className="space-y-4 pb-6">
                  {items.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-950/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
                      <div className="flex justify-between items-start">
                        <input type="text" value={item.particulars} onChange={(e) => updateItem(item.id, { particulars: e.target.value })} placeholder="Particulars" className="flex-1 bg-transparent border-none text-slate-900 dark:text-white font-bold focus:ring-0 p-0 text-base brand-font" />
                        <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-400 hover:text-rose-500">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Weight</label>
                          <div className="relative">
                             <input type="number" step="0.01" value={item.weight === 0 ? '' : item.weight} onChange={(e) => updateItem(item.id, { weight: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm" />
                             <span className="absolute right-2 top-2 text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase">{item.weightUnit}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Unit Price</label>
                          <input type="number" value={item.unitPrice === 0 ? '' : item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="space-y-1 text-right">
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mr-1">Subtotal</label>
                          <div className="py-2 font-black text-slate-900 dark:text-white text-sm">{formatINR(item.total)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-12">
            <section className="no-print bg-white dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center mb-5 brand-font"><PencilIcon className="w-5 h-5 mr-3 text-violet-600 dark:text-violet-400" /> Authorized Seal</h3>
              <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900 h-32 overflow-hidden shadow-inner">
                <canvas ref={canvasRef} width={400} height={128} className="w-full h-full touch-none" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                {!signature && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-[10px] font-black uppercase tracking-[0.4em] text-violet-600 dark:text-violet-400">Sign Below</div>}
              </div>
            </section>

            <div id="invoice-bill" className="bg-white p-10 shadow-2xl rounded-[3rem] text-slate-950 border border-slate-200">
               <div className="flex justify-between items-start mb-12">
                 <div>
                   <h3 className="text-3xl font-black brand-font tracking-tight text-slate-900">INVOICE</h3>
                   <p className="text-slate-400 text-xs mt-1 font-bold uppercase tracking-widest">Ref: {currentInvoiceId}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xl font-bold brand-font text-violet-700">AstroGems Store</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Premium Gemologists</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-10 mb-12 text-sm">
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Customer</p>
                   <p className="font-black text-slate-900 text-base">{customer.name}</p>
                   <p className="text-slate-500 font-medium">{customer.phone}</p>
                   <p className="text-slate-400 text-[10px] leading-relaxed mt-2 uppercase">{customer.address}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Issued On</p>
                   <p className="font-black text-slate-900 text-base">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                 </div>
               </div>

               <table className="w-full mb-12">
                 <thead>
                   <tr className="border-b-2 border-slate-100 text-left">
                     <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Particulars</th>
                     <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Weight</th>
                     <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {items.map((item) => (
                     <tr key={item.id}>
                       <td className="py-5">
                          <p className="text-sm font-bold text-slate-900">{item.particulars}</p>
                          <p className="text-[10px] text-slate-400 font-medium">@ {formatINR(item.unitPrice)} per unit</p>
                       </td>
                       <td className="py-5 text-center text-sm font-bold text-slate-500">{item.weight > 0 ? `${item.weight} ${item.weightUnit}` : '-'}</td>
                       <td className="py-5 text-right text-sm font-black text-slate-900">{formatINR(item.total)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>

               <div className="flex flex-col items-end space-y-3 border-t-2 pt-8 border-slate-100">
                  {isGstEnabled && (
                    <div className="flex justify-between w-full max-w-[200px] text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <span>GST ({taxRate}%)</span>
                      <span>{formatINR(totals.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-full max-w-[240px] text-2xl font-black">
                    <span className="text-slate-400 brand-font italic text-lg">Amount Due</span>
                    <span className="text-violet-700">{formatINR(totals.grandTotal)}</span>
                  </div>
               </div>

               <div className="flex justify-between items-end mt-16">
                 <div className="text-[9px] text-slate-400 max-w-[180px] leading-relaxed italic">
                   * Disclaimer: Astrology gems are provided based on planetary alignments. Natural stones may vary in appearance. Certificates provided upon request.
                 </div>
                 <div className="text-center min-w-[140px]">
                   {signature && <img src={signature} alt="Sign" className="max-h-16 mx-auto mb-2 mix-blend-multiply" />}
                   <div className="h-px bg-slate-300 mb-2"></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Seal / Signature</p>
                 </div>
               </div>
            </div>

            <div className="no-print space-y-4 px-2">
              <button onClick={handlePrint} className="w-full bg-violet-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-violet-900/40 active:scale-95 transition-all flex items-center justify-center">
                 <PrinterIcon className="w-5 h-5 mr-3" /> Print / Save PDF
              </button>
              <button onClick={handleShare} className="w-full bg-slate-800 text-violet-400 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] border border-violet-500/20 active:scale-95 transition-all flex items-center justify-center">
                 <ShareIcon className="w-5 h-5 mr-3" /> Share to WhatsApp
              </button>
              <button onClick={handleNewSession} className="w-full bg-white dark:bg-slate-900 text-slate-500 py-4 rounded-[2rem] font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-800 transition-colors hover:text-violet-600 dark:hover:text-violet-400">Start New Session</button>
            </div>
          </div>
        )}
      </main>

      <footer className="flex-none bg-white dark:bg-slate-950 p-5 border-t border-slate-200 dark:border-slate-800 shadow-inner no-print pb-[env(safe-area-inset-bottom,20px)] transition-colors duration-300">
        <div className="flex gap-4">
          {step > 1 && (
            <button onClick={() => setStep(prev => (prev - 1) as any)} className="flex-1 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform">Back</button>
          )}
          {step < 3 && (
            <button 
              onClick={() => step === 1 ? setStep(2) : handleFinish()}
              disabled={step === 2 && items.length === 0}
              className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${step === 2 && items.length === 0 ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600' : 'bg-violet-600 text-white shadow-violet-900/30'}`}
            >
              {step === 1 ? 'Go to Inventory' : 'Finalize & Preview'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;