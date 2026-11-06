import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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

const formatCurrency = (value: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
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
      return 'bg-[#3B82F6] text-white';
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
      return 'bg-red-500/20 text-red-400';
    case 'paybill':
    case 'buy_goods':
      return 'bg-purple-500/20 text-purple-400';
    case 'airtime':
      return 'bg-orange-500/20 text-orange-400';
    case 'reversal':
      return 'bg-gray-500/20 text-gray-400';
    case 'received':
    case 'deposit':
      return 'bg-[#3B82F6]/20 text-[#3B82F6]';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

export const MpesaPage: React.FC<MpesaPageProps> = ({ selectedCurrency: _selectedCurrency = 'KES' }) => {
  const [stats, setStats] = useState<MpesaStats>({ imported: 0, skipped: 0, duplicates: 0, failed: 0 });
  const [imports, setImports] = useState<MpesaImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [smsInput, setSmsInput] = useState('');
  const [importing, setImporting] = useState(false);
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
  }, []);

  const handleImport = async (e: React.FormEvent) => {
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
        setShowImportModal(false);
        fetchStats();
        fetchImports();
      } else {
        const errData = await res.json();
        setImportResult({ imported: 0, skipped: 0, duplicates: 0, failed: 1, details: [{ transaction_ref: '', status: 'failed', error_message: errData.error || 'Import failed', expense_id: null, amount: 0, transaction_type: '' }] });
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportResult({ imported: 0, skipped: 0, duplicates: 0, failed: 1, details: [{ transaction_ref: '', status: 'failed', error_message: 'Server error', expense_id: null, amount: 0, transaction_type: '' }] });
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
      <div className="p-8 max-w-7xl mx-auto text-white font-sans">
        <p className="text-gray-400">Loading M-Pesa integration...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-white font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-gray-400">INTEGRATIONS</span>
          <h1 className="text-4xl font-sans font-bold text-white mt-1">M-Pesa SMS Import</h1>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#3B82F6] text-white font-semibold rounded-full hover:bg-[#2563EB] transition-colors cursor-pointer shadow-[0_0_24px_rgba(59,130,246,0.3)]"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          Import SMS
        </button>
      </div>

      {/* Integration Status Card */}
      <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Integration Status</h2>
          <span className="px-3 py-1 bg-[#3B82F6]/20 text-[#3B82F6] text-xs font-semibold rounded-full">
            Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Imported</div>
            <div className="text-3xl font-sans font-bold text-[#3B82F6]">{stats.imported}</div>
          </div>
          <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Skipped</div>
            <div className="text-3xl font-sans font-bold text-amber-400">{stats.skipped}</div>
          </div>
          <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Duplicates</div>
            <div className="text-3xl font-sans font-bold text-blue-400">{stats.duplicates}</div>
          </div>
          <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Failed</div>
            <div className="text-3xl font-sans font-bold text-red-400">{stats.failed}</div>
          </div>
        </div>

        <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3">How to Import M-Pesa SMS</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-full flex items-center justify-center text-xs">1</span>
              Open the M-Pesa SMS in your messaging app
            </p>
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-full flex items-center justify-center text-xs">2</span>
              Long-press the message → Copy text
            </p>
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-full flex items-center justify-center text-xs">3</span>
              Paste into the import box below (one SMS per line)
            </p>
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-full flex items-center justify-center text-xs">4</span>
              Click Import — we'll parse and categorize automatically
            </p>
          </div>
        </div>
      </div>

      {/* Recent Import Activity */}
      <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
          <h2 className="text-xl font-bold text-white">Import History</h2>
        </div>

        {imports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg mb-2">No imports yet</p>
            <p className="text-sm">Click "Import SMS" to add your first M-Pesa transactions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#14141A] text-gray-400">
                <tr>
                  <th className="p-3 font-semibold">Date & Time</th>
                  <th className="p-3 font-semibold">Reference</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Amount</th>
                  <th className="p-3 font-semibold">Party</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((imp) => (
                  <tr key={imp.id} className="border-t border-[rgba(255,255,255,0.1)] hover:bg-[#14141A]">
                    <td className="p-3 text-gray-300">{formatDate(imp.transaction_date)}</td>
                    <td className="p-3 font-mono text-xs text-white">{imp.transaction_ref || imp.fingerprint.slice(0, 12)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${getTypeColor(imp.transaction_type)}`}>
                        {imp.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-white">
                      {formatCurrency(imp.amount, imp.currency)}
                    </td>
                    <td className="p-3 text-gray-300">
                      {imp.sender || imp.recipient || imp.phone_number || '—'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${getStatusColor(imp.status)}`}>
                        {imp.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {imp.status === 'imported' && !imp.expense_id && (
                        <button
                          onClick={() => handleCreateExpense(imp.id)}
                          className="px-3 py-1 bg-[#3B82F6] text-white text-xs font-semibold rounded-lg hover:bg-[#2563EB] transition-colors"
                        >
                          Create Expense
                        </button>
                      )}
                      {imp.expense_id && (
                        <span className="px-2 py-1 bg-gray-500 text-white text-xs font-semibold rounded-lg">
                          Expense #{imp.expense_id}
                        </span>
                      )}
                      {imp.status === 'failed' && (
                        <button
                          onClick={() => handleDeleteImport(imp.id)}
                          className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import SMS Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 w-full max-w-2xl text-white max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Import M-Pesa SMS</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Paste M-Pesa SMS messages (one per line)
                </label>
                <textarea
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  placeholder={[
                    "KSh1,500.00 sent to JOHN DOE 254712345678 on 22/10/23 at 10:30. Ref: ABC123XYZ. Fee: KSh25.00. Balance: KSh5,000.00",
                    "You have received KSh2,000.00 from JANE SMITH 254798765432 on 22/10/23 at 14:15. Ref: DEF456UVW. Balance: KSh7,000.00",
                    "KSh500.00 paid to KENYA POWER paybill 888888 on 21/10/23. Ref: GHI789RST. Fee: KSh0.00. Balance: KSh6,500.00",
                  ].join('\n\n')}
                  rows={8}
                  className="w-full bg-[#14141A] border border-[rgba(255,255,255,0.12)] rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-y"
                />
              </div>

              {importResult && (
                <div className="bg-[#14141A] border border-[rgba(255,255,255,0.1)] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-white">Import Result</h4>
                    <button
                      type="button"
                      onClick={() => setImportResult(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-[#3B82F6]/20 p-2 rounded-lg">
                      <div className="text-2xl font-bold text-[#3B82F6]">{importResult.imported}</div>
                      <div className="text-xs text-gray-400">Imported</div>
                    </div>
                    <div className="bg-amber-500/20 p-2 rounded-lg">
                      <div className="text-2xl font-bold text-amber-400">{importResult.skipped}</div>
                      <div className="text-xs text-gray-400">Skipped</div>
                    </div>
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{importResult.duplicates}</div>
                      <div className="text-xs text-gray-400">Duplicates</div>
                    </div>
                    <div className="bg-red-500/20 p-2 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">{importResult.failed}</div>
                      <div className="text-xs text-gray-400">Failed</div>
                    </div>
                  </div>
                  {importResult.details.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.details.map((detail, idx) => (
                        <div key={idx} className="text-xs text-gray-300 flex justify-between gap-2">
                          <span>{detail.transaction_ref || detail.transaction_type}</span>
                          <span className={`font-semibold ${detail.status === 'imported' ? 'text-[#3B82F6]' : detail.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                            {detail.status}
                          </span>
                          {detail.error_message && <span className="text-red-400">{detail.error_message}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportResult(null); }}
                  className="px-4 py-2 bg-[rgba(255,255,255,0.1)] text-gray-300 rounded-lg hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !smsInput.trim()}
                  className="px-5 py-2 bg-[#3B82F6] text-white font-semibold rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MpesaPage;