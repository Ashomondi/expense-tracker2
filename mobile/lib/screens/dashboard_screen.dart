import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/mpesa_transaction.dart';
import '../services/api_service.dart';
import '../services/sms_service.dart';
import '../widgets/consent_dialog.dart';

class DashboardScreen extends StatefulWidget {
  final ApiService apiService;
  final SmsService smsService;

  const DashboardScreen({
    super.key,
    required this.apiService,
    required this.smsService,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = false;
  bool _isSyncing = false;
  Map<String, int> _stats = {'imported': 0, 'skipped': 0, 'duplicates': 0, 'failed': 0};
  List<MpesaTransaction> _transactions = [];
  String? _syncMessage;

  final currencyFormatter = NumberFormat.currency(locale: 'en_KE', symbol: 'KSh ', decimalDigits: 2);
  final dateFormatter = DateFormat('dd MMM yyyy, HH:mm');

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  Future<void> _refreshData() async {
    setState(() => _isLoading = true);
    final stats = await widget.apiService.getStats();
    final txs = await widget.apiService.getImports(limit: 50);

    if (mounted) {
      setState(() {
        _stats = stats;
        _transactions = txs;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleSyncPressed() async {
    final hasPermission = await widget.smsService.checkPermission();

    if (!mounted) return;

    if (!hasPermission) {
      final consented = await MpesaConsentDialog.show(
        context,
        onConsentGranted: () async {
          final granted = await widget.smsService.requestPermission();
          if (granted) {
            _executeSmsSync();
          } else if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('SMS permission is required to read M-Pesa inbox.')),
            );
          }
        },
      );
      if (consented == true) return;
    } else {
      _executeSmsSync();
    }
  }

  Future<void> _executeSmsSync() async {
    setState(() {
      _isSyncing = true;
      _syncMessage = 'Scanning M-Pesa inbox...';
    });

    try {
      final messages = await widget.smsService.readMpesaInbox(limit: 100);
      if (messages.isEmpty) {
        if (mounted) {
          setState(() {
            _isSyncing = false;
            _syncMessage = 'No M-Pesa SMS found in inbox.';
          });
        }
        return;
      }

      if (mounted) {
        setState(() {
          _syncMessage = 'Syncing ${messages.length} M-Pesa messages to Spendly...';
        });
      }

      final rawBodies = messages.map((m) => m.body).toList();
      final result = await widget.apiService.importSmsBatch(rawBodies);

      final imported = result['imported'] ?? 0;
      final duplicates = result['duplicates'] ?? 0;

      if (mounted) {
        setState(() {
          _isSyncing = false;
          _syncMessage = 'Sync complete: $imported imported, $duplicates duplicates skipped.';
        });
      }

      await _refreshData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text(
              'Synced successfully: $imported new, $duplicates already tracked.',
              style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSyncing = false;
          _syncMessage = 'Sync failed: $e';
        });
      }
    }
  }

  void _showSettingsDialog() {
    final controller = TextEditingController(text: widget.apiService.baseUrl);
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: const Color(0xFF1A1F1C),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF2D3A33)),
        ),
        title: const Text('Server Configuration', style: TextStyle(color: Colors.white, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Spendly API Endpoint:',
              style: TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'http://10.0.2.2:8080',
                hintStyle: const TextStyle(color: Colors.white30),
                filled: true,
                fillColor: const Color(0xFF121715),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF2D3A33)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Note: Android Emulator uses 10.0.2.2:8080 to connect to your host machine.',
              style: TextStyle(color: Colors.white38, fontSize: 11),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.black),
            onPressed: () async {
              await widget.apiService.setBaseUrl(controller.text.trim());
              if (dialogContext.mounted) {
                Navigator.pop(dialogContext);
              }
              _refreshData();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E1310),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E1310),
        elevation: 0,
        title: Row(
          children: [
            const Text(
              'Spendly',
              style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 22),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
              ),
              child: const Text(
                'M-PESA COMPANION',
                style: TextStyle(color: Color(0xFF10B981), fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: Colors.white70),
            onPressed: _showSettingsDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _refreshData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshData,
        color: const Color(0xFF10B981),
        backgroundColor: const Color(0xFF1A1F1C),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSyncCard(),
              const SizedBox(height: 16),
              _buildStatsGrid(),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Synced M-Pesa Records',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${_transactions.length} items',
                    style: const TextStyle(color: Colors.white38, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_isLoading && _transactions.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: Color(0xFF10B981)),
                  ),
                )
              else if (_transactions.isEmpty)
                _buildEmptyState()
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _transactions.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final tx = _transactions[index];
                    return _buildTransactionCard(tx);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyncCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1A1F1C),
            const Color(0xFF10B981).withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.2)),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.sync_alt, color: Color(0xFF10B981), size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Automated SMS Ingestion',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Scans M-Pesa SMS and parses expenses into Spendly',
                      style: TextStyle(color: Colors.white60, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_syncMessage != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF121715),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF2D3A33)),
              ),
              child: Text(
                _syncMessage!,
                style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontFamily: 'monospace'),
              ),
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              onPressed: _isSyncing ? null : _handleSyncPressed,
              icon: _isSyncing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                    )
                  : const Icon(Icons.cloud_upload_outlined, size: 20),
              label: Text(
                _isSyncing ? 'Syncing Inbox...' : 'Scan & Sync M-Pesa SMS',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    return Row(
      children: [
        _buildStatTile('Imported', _stats['imported'] ?? 0, const Color(0xFF10B981)),
        const SizedBox(width: 8),
        _buildStatTile('Duplicates', _stats['duplicates'] ?? 0, Colors.blueAccent),
        const SizedBox(width: 8),
        _buildStatTile('Skipped', _stats['skipped'] ?? 0, Colors.amber),
        const SizedBox(width: 8),
        _buildStatTile('Failed', _stats['failed'] ?? 0, Colors.redAccent),
      ],
    );
  }

  Widget _buildStatTile(String title, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1A1F1C),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF2D3A33)),
        ),
        child: Column(
          children: [
            Text(
              count.toString(),
              style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: const TextStyle(color: Colors.white54, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionCard(MpesaTransaction tx) {
    final isExpense = tx.transactionType != 'received' && tx.transactionType != 'deposit';
    final amountColor = isExpense ? Colors.white : const Color(0xFF10B981);
    final prefix = isExpense ? '-' : '+';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1A1F1C),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF2D3A33)),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isExpense ? Colors.redAccent.withValues(alpha: 0.12) : const Color(0xFF10B981).withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isExpense ? Icons.arrow_outward : Icons.arrow_downward,
              color: isExpense ? Colors.redAccent : const Color(0xFF10B981),
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      tx.transactionRef.isNotEmpty ? tx.transactionRef : 'M-PESA',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFF121715),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFF2D3A33)),
                      ),
                      child: Text(
                        tx.transactionType.toUpperCase(),
                        style: const TextStyle(color: Colors.white60, fontSize: 8, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  tx.recipient.isNotEmpty ? tx.recipient : (tx.sender.isNotEmpty ? tx.sender : tx.rawMessage),
                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  dateFormatter.format(tx.transactionDate),
                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$prefix${currencyFormatter.format(tx.amount)}',
                style: TextStyle(color: amountColor, fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 4),
              if (tx.id != null && isExpense)
                InkWell(
                  onTap: () async {
                    final ok = await widget.apiService.createExpense(tx.id!);
                    if (ok && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Expense logged to Spendly!'),
                          backgroundColor: Color(0xFF10B981),
                        ),
                      );
                      _refreshData();
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      '+ Track',
                      style: TextStyle(color: Color(0xFF10B981), fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1F1C),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF2D3A33)),
      ),
      child: const Column(
        children: [
          Icon(Icons.inbox_outlined, color: Colors.white24, size: 48),
          SizedBox(height: 12),
          Text(
            'No M-Pesa Transactions Yet',
            style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 14),
          ),
          SizedBox(height: 4),
          Text(
            'Tap "Scan & Sync M-Pesa SMS" above to ingest your transaction history.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white38, fontSize: 11),
          ),
        ],
      ),
    );
  }
}
