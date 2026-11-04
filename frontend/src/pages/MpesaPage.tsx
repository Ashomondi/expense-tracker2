import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../api';

interface MpesaPageProps {
  selectedCurrency?: 'KES' | 'USD' | 'EUR' | 'GBP';
}

interface MpesaImport {
  id: number;
  created_at: string;
  transaction_ref: string;
  transaction_type: string;
  amount: number;
  fee: number;
  balance: number;
  sender: string;
  recipient: string;
  phone_number: string;
  transaction_date: string;
  status: string;
  error_message: string;
  expense_id: number | null;
  currency: string;
  fingerprint: string;
}

interface MpesaStats {
  imported: number;
  skipped: number;
  duplicates: number;
  failed: number;
}

interface PreviewItem {
  transaction_ref: string;
  transaction_type: string;
  amount: number;
  balance: number;
  sender: string;
  recipient: string;
  phone_number: string;
  transaction_date: string;
  currency: string;
}

const formatCurrency = (value: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'imported':
      return 'bg-[#10B981] text-white';
    case 'skipped':
      return 'bg-amber-500 text-white';
    case 'duplicate':
      return 'bg-blue-500 text-white';
    case 'failed':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'sent':
    case 'withdrawal':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'paybill':
    case 'buy_goods':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case 'airtime':
      return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'reversal':
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    case 'received':
    case 'deposit':
      return 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
};

export const MpesaPage: React.FC<MpesaPageProps> = ({ selectedCurrency = 'KES' }) => {
  const [stats, setStats] = useState<MpesaStats>({ imported: 0, skipped: 0, duplicates: 0, failed: 0 });
  const [imports, setImports] = useState<MpesaImport[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeImportTab, setActiveImportTab] = useState<'sms' | 'statement'>('sms');

  // SMS Input State
  const [smsInput, setSmsInput] = useState('');
  const [importing, setImporting] = useState(false);

  // Statement Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewingStatement, setPreviewingStatement] = useState(false);
  const [statementPreview, setStatementPreview] = useState<PreviewItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import Result Feedback
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    duplicates: number;
    failed: number;
    details: Array<{
      transaction_ref: string;
      status: string;
      error_message: string;
      expense_id: number | null;
      amount: number;
      transaction_type: string;
    }>;
  } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/mpesa/status`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || { imported: 0, skipped: 0, duplicates: 0, failed: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchImports = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/mpesa/imports?limit=50`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setImports(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch imports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchImports();

    // Check for incoming share target query parameter (?share_text= or ?text=)
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text') || urlParams.get('share_text') || urlParams.get('body');
    if (sharedText) {
      setSmsInput(sharedText);
      setActiveImportTab('sms');
      setShowImportModal(true);
      // Clean query params from URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        alert('Clipboard is empty.');
        return;
      }
      setSmsInput(text.trim());
      setActiveImportTab('sms');
      setShowImportModal(true);
    } catch (err) {
      console.warn('Clipboard read error or not permitted', err);
      setActiveImportTab('sms');
      setShowImportModal(true);
    }
  };

  const handleImportSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsInput.trim()) return;

    setImporting(true);
    setImportResult(null);

    try {
      const messages = smsInput.trim().split('\n').filter(m => m.trim());
      const transactions = messages.map(msg => ({ raw_message: msg.trim() }));

      const res = await fetch(`${API_BASE}/api/integrations/mpesa/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transactions }),
      });

      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        setSmsInput('');
        fetchStats();
        fetchImports();
      } else {
        const errData = await res.json();
        setImportResult({
          imported: 0,
          skipped: 0,
          duplicates: 0,
          failed: 1,
          details: [{
            transaction_ref: '',
            status: 'failed',
            error_message: errData.error || 'Import failed',
            expense_id: null,
            amount: 0,
            transaction_type: '',
          }],
        });
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportResult({
        imported: 0,
        skipped: 0,
        duplicates: 0,
        failed: 1,
        details: [{
          transaction_ref: '',
          status: 'failed',
          error_message: 'Server error',
          expense_id: null,
          amount: 0,
          transaction_type: '',
        }],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setStatementPreview(null);
      setImportResult(null);
    }
  };

  const handlePreviewStatement = async () => {
    if (!selectedFile) return;

    setPreviewingStatement(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE}/api/integrations/mpesa/statement?preview=true`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.preview && data.preview.transactions) {
          setStatementPreview(data.preview.transactions);
        } else {
          alert('No transactions could be detected in this file.');
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to parse statement.');
      }
    } catch (err) {
      console.error('Statement preview failed:', err);
      alert('Error connecting to server.');
    } finally {
      setPreviewingStatement(false);
    }
  };

  const handleCommitStatement = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE}/api/integrations/mpesa/statement`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.import) {
          setImportResult(data.import);
        }
        setSelectedFile(null);
        setStatementPreview(null);
        fetchStats();
        fetchImports();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to import statement.');
      }
    } catch (err) {
      console.error('Statement import failed:', err);
      alert('Server error while importing statement.');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateExpense = async (importId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/mpesa/expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ import_id: importId }),
      });

      if (res.ok) {
        fetchImports();
        fetchStats();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to create expense');
      }
    } catch (err) {
      console.error('Failed to create expense:', err);
      alert('Server error');
    }
  };

  const handleDeleteImport = async (importId: number) => {
    if (!confirm('Delete this import record?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/integrations/mpesa/import`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ import_id: importId }),
      });

      if (res.ok) {
        fetchImports();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to delete import:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-white">
        <p className="text-gray-400">Loading M-Pesa integration...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-[#10B981]">MULTI-CHANNEL INTEGRATIONS</span>
          <h1 className="text-4xl font-serif font-bold text-white mt-1">M-Pesa Sync & Statements</h1>
          <p className="text-sm text-gray-400 mt-1">
            Dynamic ingestion via SMS paste, Safaricom PDF/CSV statements, and Mobile Companion sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handlePasteClipboard}
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer flex items-center gap-2 text-sm"
            title="Read M-Pesa SMS from Clipboard"
          >
            📋 Paste Clipboard
          </button>
          <button
            onClick={() => {
              setActiveImportTab('statement');
              setShowImportModal(true);
            }}
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer flex items-center gap-2 text-sm"
          >
            📄 Upload Statement
          </button>
          <button
            onClick={() => {
              setActiveImportTab('sms');
              setShowImportModal(true);
            }}
            className="px-5 py-2.5 bg-[#10B981] text-black font-semibold rounded-lg hover:bg-[#0ea572] transition-colors cursor-pointer flex items-center gap-2 text-sm shadow-lg shadow-[#10B981]/15"
          >
            + Import Messages
          </button>
        </div>
      </div>

      {/* Integration Status Card */}
      <div className="bg-[#1A1F1C] border border-[#2D3A33] rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse"></div>
            <h2 className="text-xl font-bold text-white">M-Pesa Ingestion Engine</h2>
          </div>
          <span className="px-3 py-1 bg-[#10B981]/20 text-[#10B981] text-xs font-semibold rounded-full border border-[#10B981]/30">
            Active & Synced
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Imported</div>
            <div className="text-3xl font-serif font-bold text-[#10B981]">{stats.imported}</div>
          </div>
          <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Skipped</div>
            <div className="text-3xl font-serif font-bold text-amber-400">{stats.skipped}</div>
          </div>
          <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Duplicates Avoided</div>
            <div className="text-3xl font-serif font-bold text-blue-400">{stats.duplicates}</div>
          </div>
          <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Failed</div>
            <div className="text-3xl font-serif font-bold text-red-400">{stats.failed}</div>
          </div>
        </div>

        {/* Dynamic 3 Options Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#10B981] font-semibold text-sm mb-1.5">
                <span>📱 Option 1: Mobile APK</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Connect your Android phone using our Spendly companion app. With your explicit consent, it reads your M-PESA SMS inbox and auto-syncs transactions.
              </p>
            </div>
            <span className="text-[11px] text-gray-500 font-mono mt-3">Ready for download</span>
          </div>

          <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-1.5">
                <span>📄 Option 2: Statement Upload</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Download your official monthly or yearly statement from Safaricom (*334# or App) as CSV/PDF and upload it here for bulk historical ingestion.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveImportTab('statement');
                setShowImportModal(true);
              }}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium text-left mt-3 underline"
            >
              Upload Statement File →
            </button>
          </div>

          <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-1.5">
                <span>🌐 Option 3: PWA Web Share Target</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Install Spendly as a PWA on your mobile browser. Select any M-Pesa SMS in your messaging app and tap "Share" → Spendly to import instantly.
              </p>
            </div>
            <button
              onClick={handlePasteClipboard}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium text-left mt-3 underline"
            >
              Test Clipboard Paste →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Import Activity */}
      <div className="bg-[#1A1F1C] border border-[#2D3A33] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#2D3A33] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Imported Transactions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Showing last 50 processed transactions</p>
          </div>
          <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {imports.length} Records
          </span>
        </div>

        {imports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg font-medium text-gray-300">No M-Pesa transactions imported yet</p>
            <p className="text-xs mt-1">Import messages or upload a statement above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#121715] text-xs text-gray-400 uppercase tracking-wider border-b border-[#2D3A33]">
                <tr>
                  <th className="py-3 px-4">Ref / ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Details / Counterparty</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3A33]/50">
                {imports.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-white">
                      {item.transaction_ref || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-300">
                      {formatDate(item.transaction_date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getTypeColor(item.transaction_type)}`}>
                        {item.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-300 max-w-xs truncate">
                      {item.recipient || item.sender || item.phone_number || 'General Transaction'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold font-mono text-white">
                      {formatCurrency(item.amount, selectedCurrency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {!item.expense_id && item.transaction_type !== 'received' && item.transaction_type !== 'deposit' && (
                        <button
                          onClick={() => handleCreateExpense(item.id)}
                          className="px-2.5 py-1 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/30 rounded text-xs transition-colors cursor-pointer"
                        >
                          + Track
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImport(item.id)}
                        className="text-gray-500 hover:text-red-400 text-xs transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: SMS or Statement Ingestion */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1F1C] border border-[#2D3A33] rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-[#2D3A33]">
              <h3 className="text-xl font-bold text-white">Import M-Pesa Data</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                  setStatementPreview(null);
                }}
                className="text-gray-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Segmented Tabs */}
            <div className="flex bg-[#121715] p-1 rounded-xl my-4 border border-[#2D3A33]">
              <button
                type="button"
                onClick={() => setActiveImportTab('sms')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeImportTab === 'sms'
                    ? 'bg-[#10B981] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📱 SMS Messages (Paste / Share)
              </button>
              <button
                type="button"
                onClick={() => setActiveImportTab('statement')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeImportTab === 'statement'
                    ? 'bg-[#10B981] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📄 Statement Upload (CSV / PDF / TXT)
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {/* Tab 1: SMS Messages */}
              {activeImportTab === 'sms' && (
                <form onSubmit={handleImportSMS} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-gray-400">
                        Paste one or more M-Pesa SMS messages
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteClipboard}
                        className="text-xs text-[#10B981] hover:underline"
                      >
                        Paste from clipboard
                      </button>
                    </div>
                    <textarea
                      value={smsInput}
                      onChange={(e) => setSmsInput(e.target.value)}
                      placeholder={[
                        "QK87XYZ123 Confirmed. Ksh1,500.00 sent to JOHN DOE 254712345678 on 22/10/26 at 10:30 AM. Fee: Ksh25.00. Balance: Ksh5,000.00",
                        "QK88ABC456 Confirmed. Ksh500.00 paid to KENYA POWER. Ref: 888888. Fee: Ksh0.00. Balance: Ksh4,500.00",
                      ].join('\n\n')}
                      rows={7}
                      className="w-full bg-[#121715] border border-[#3D4A43] rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-y font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 bg-[#2D3A33] text-gray-300 text-sm rounded-lg hover:bg-[#3D4A43] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importing || !smsInput.trim()}
                      className="px-5 py-2 bg-[#10B981] text-black font-semibold text-sm rounded-lg hover:bg-[#0ea572] transition-colors disabled:opacity-50"
                    >
                      {importing ? 'Processing...' : 'Import Messages'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Statement Upload */}
              {activeImportTab === 'statement' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2D3A33] hover:border-[#10B981]/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#121715]"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv,.txt,.pdf,.tsv"
                      className="hidden"
                    />
                    <div className="text-3xl mb-2">📁</div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-semibold text-[#10B981]">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-white">Click or drag & drop Safaricom statement</p>
                        <p className="text-xs text-gray-400 mt-1">Supports CSV, TSV, text statement exports, or extracted text</p>
                      </div>
                    )}
                  </div>

                  {selectedFile && !statementPreview && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handlePreviewStatement}
                        disabled={previewingStatement}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {previewingStatement ? 'Analyzing Statement...' : 'Preview Parsed Rows'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCommitStatement}
                        disabled={importing}
                        className="px-5 py-2 bg-[#10B981] hover:bg-[#0ea572] text-black text-xs font-semibold rounded-lg transition-colors"
                      >
                        {importing ? 'Importing...' : 'Direct Import'}
                      </button>
                    </div>
                  )}

                  {/* Statement Preview Table */}
                  {statementPreview && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-300">
                          Found {statementPreview.length} M-Pesa transactions in file:
                        </span>
                        <button
                          type="button"
                          onClick={() => setStatementPreview(null)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Clear Preview
                        </button>
                      </div>

                      <div className="max-h-56 overflow-y-auto border border-[#2D3A33] rounded-lg bg-[#121715]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#1A1F1C] text-gray-400 sticky top-0">
                            <tr>
                              <th className="p-2">Ref</th>
                              <th className="p-2">Type</th>
                              <th className="p-2">Recipient / Details</th>
                              <th className="p-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2D3A33]/50">
                            {statementPreview.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02]">
                                <td className="p-2 font-mono text-[11px] text-gray-200">{tx.transaction_ref}</td>
                                <td className="p-2 text-[10px] uppercase font-semibold text-gray-400">{tx.transaction_type}</td>
                                <td className="p-2 text-gray-300 truncate max-w-[180px]">{tx.recipient || tx.sender || 'Statement Entry'}</td>
                                <td className="p-2 text-right font-mono font-semibold text-[#10B981]">{formatCurrency(tx.amount, 'KES')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCommitStatement}
                          disabled={importing}
                          className="px-5 py-2 bg-[#10B981] text-black font-semibold text-sm rounded-lg hover:bg-[#0ea572] transition-colors"
                        >
                          {importing ? 'Saving Transactions...' : `Import All (${statementPreview.length}) Transactions`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Import Results Banner */}
              {importResult && (
                <div className="bg-[#121715] border border-[#2D3A33] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-white text-sm">Batch Import Summary</h4>
                    <button
                      type="button"
                      onClick={() => setImportResult(null)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-[#10B981]/20 border border-[#10B981]/30 p-2 rounded-lg">
                      <div className="text-xl font-bold text-[#10B981]">{importResult.imported}</div>
                      <div className="text-[10px] text-gray-400 uppercase">Imported</div>
                    </div>
                    <div className="bg-amber-500/20 border border-amber-500/30 p-2 rounded-lg">
                      <div className="text-xl font-bold text-amber-400">{importResult.skipped}</div>
                      <div className="text-[10px] text-gray-400 uppercase">Skipped</div>
                    </div>
                    <div className="bg-blue-500/20 border border-blue-500/30 p-2 rounded-lg">
                      <div className="text-xl font-bold text-blue-400">{importResult.duplicates}</div>
                      <div className="text-[10px] text-gray-400 uppercase">Duplicates</div>
                    </div>
                    <div className="bg-red-500/20 border border-red-500/30 p-2 rounded-lg">
                      <div className="text-xl font-bold text-red-400">{importResult.failed}</div>
                      <div className="text-[10px] text-gray-400 uppercase">Failed</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MpesaPage;
