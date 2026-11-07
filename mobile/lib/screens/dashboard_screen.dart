import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/mpesa_transaction.dart';
import '../services/api_service.dart';
import '../services/mpesa_local_parser.dart';
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
    _initData();
  }

  Future<void> _initData() async {
    setState(() => _isLoading = true);

    // 1. Load local transactions from device storage first (instant offline response)
    final localTxs = await widget.apiService.loadLocalTransactions();
    if (mounted && localTxs.isNotEmpty) {
      setState(() {
        _transactions = localTxs;
        _recalculateLocalStats();
      });
    }

    // 2. Fetch server updates if online & authenticated
    await _refreshData();
  }

  void _recalculateLocalStats() {
    int imported = 0;
    for (final tx in _transactions) {
      if (tx.status == 'synced' || tx.status == 'imported') {
        imported++;
      }
    }
    setState(() {
      _stats = {
        'imported': imported,
        'duplicates': _stats['duplicates'] ?? 0,
        'skipped': _transactions.length - imported,
        'failed': 0,
      };
    });
  }

  Future<void> _refreshData() async {
    if (!widget.apiService.isAuthenticated) {
      final localTxs = await widget.apiService.loadLocalTransactions();
      if (mounted) {
        setState(() {
          _transactions = localTxs;
          _isLoading = false;
          _recalculateLocalStats();
        });
      }
      return;
    }

    setState(() => _isLoading = true);
    final stats = await widget.apiService.getStats();
    final serverTxs = await widget.apiService.getImports(limit: 50);

    if (mounted) {
      setState(() {
        _stats = stats;
        if (serverTxs.isNotEmpty) {
          // Merge server transactions with any local-only ones
          final existingRefs = serverTxs.map((t) => t.transactionRef).toSet();
          final localOnly = _transactions.where((t) => !existingRefs.contains(t.transactionRef)).toList();
          _transactions = [...serverTxs, ...localOnly];
          widget.apiService.saveLocalTransactions(_transactions);
        }
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

  Future<void> _executeSmsSync({bool useSimulatedFallback = false}) async {
    setState(() {
      _isSyncing = true;
      _syncMessage = 'Scanning SMS inbox for M-Pesa messages...';
    });

    try {
      final rawMessages = await widget.smsService.readMpesaInbox(
        limit: 100,
        fallbackToSimulated: useSimulatedFallback,
      );

      if (rawMessages.isEmpty) {
        if (mounted) {
          setState(() {
            _isSyncing = false;
            _syncMessage = 'No M-Pesa SMS found in inbox. (Tap ⚙️ to load sample test data)';
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('No M-Pesa messages detected in your inbox. You can load sample test SMS from Settings.'),
              action: SnackBarAction(
                label: 'Load Sample',
                onPressed: () => _executeSmsSync(useSimulatedFallback: true),
              ),
            ),
          );
        }
        return;
      }

      if (mounted) {
        setState(() {
          _syncMessage = 'Found ${rawMessages.length} messages. Parsing transactions...';
        });
      }

      // 1. Local on-device parsing (works offline 100% reliably)
      final List<MpesaTransaction> newlyParsed = [];
      for (final raw in rawMessages) {
        final parsed = MpesaLocalParser.parse(
          raw.body,
          id: raw.id,
          timestamp: raw.timestamp,
        );
        if (parsed != null) {
          newlyParsed.add(parsed);
        }
      }

      // Deduplicate against existing list by reference
      final currentRefs = _transactions.map((t) => t.transactionRef).toSet();
      final toAdd = newlyParsed.where((t) => !currentRefs.contains(t.transactionRef)).toList();
      _transactions = [...toAdd, ..._transactions];
      await widget.apiService.saveLocalTransactions(_transactions);

      if (mounted) {
        setState(() {
          _recalculateLocalStats();
          _syncMessage = 'Parsed ${newlyParsed.length} transactions locally on device.';
        });
      }

      // 2. Upload to server if connected & authenticated
      final rawBodies = rawMessages.map((m) => m.body).toList();
      final syncResult = await widget.apiService.importSmsBatch(rawBodies);

      if (syncResult['success'] == true) {
        final imported = syncResult['imported'] ?? 0;
        final duplicates = syncResult['duplicates'] ?? 0;

        // Mark local items as synced
        _transactions = _transactions.map((tx) => MpesaTransaction(
          id: tx.id,
          transactionRef: tx.transactionRef,
          transactionType: tx.transactionType,
          amount: tx.amount,
          fee: tx.fee,
          balance: tx.balance,
          recipient: tx.recipient,
          sender: tx.sender,
          counterparty: tx.counterparty,
          phoneNumber: tx.phoneNumber,
          currency: tx.currency,
          transactionDate: tx.transactionDate,
          status: 'synced',
          rawMessage: tx.rawMessage,
        )).toList();
        await widget.apiService.saveLocalTransactions(_transactions);

        if (mounted) {
          setState(() {
            _isSyncing = false;
            _syncMessage = 'Server sync complete: $imported imported, $duplicates already tracked.';
          });
          _refreshData();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Text(
                'Synced to Spendly Server: $imported new, $duplicates duplicates skipped.',
                style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
              ),
            ),
          );
        }
      } else {
        // Server upload failed or unauthenticated
        final errorMsg = syncResult['error']?.toString() ?? 'Could not reach server';
        if (mounted) {
          setState(() {
            _isSyncing = false;
            _syncMessage = 'Saved ${newlyParsed.length} messages locally. Server sync: $errorMsg';
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Colors.amber.shade800,
              duration: const Duration(seconds: 5),
              content: Text(
                'Transactions saved locally on phone!\n$errorMsg',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
              action: SnackBarAction(
                label: 'Configure ⚙️',
                textColor: Colors.white,
                onPressed: _showSettingsDialog,
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSyncing = false;
          _syncMessage = 'Scan failed: $e';
        });
      }
    }
  }

  void _showSettingsDialog() {
    final urlController = TextEditingController(text: widget.apiService.baseUrl);
    final emailController = TextEditingController(text: widget.apiService.userEmail ?? '');
    final passController = TextEditingController();
    String? pingResult;
    bool isTestingPing = false;
    bool isLoggingIn = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: const Color(0xFF1A1F1C),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: Color(0xFF2D3A33)),
            ),
            title: const Row(
              children: [
                Icon(Icons.tune, color: Color(0xFF10B981), size: 20),
                SizedBox(width: 8),
                Text('Server & Account Settings', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Spendly API Server URL:', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: urlController,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'http://192.168.89.246:8080',
                      hintStyle: const TextStyle(color: Colors.white30),
                      filled: true,
                      fillColor: const Color(0xFF121715),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2D3A33))),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Quick presets
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _presetChip('PC Wi-Fi (192.168.89.246)', 'http://192.168.89.246:8080', urlController, setDialogState),
                      _presetChip('Emulator (10.0.2.2)', 'http://10.0.2.2:8080', urlController, setDialogState),
                      _presetChip('Localhost', 'http://localhost:8080', urlController, setDialogState),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Ping test button
                  Row(
                    children: [
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF25302A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          textStyle: const TextStyle(fontSize: 11),
                        ),
                        onPressed: isTestingPing
                            ? null
                            : () async {
                                setDialogState(() => isTestingPing = true);
                                await widget.apiService.setBaseUrl(urlController.text.trim());
                                final res = await widget.apiService.testConnection();
                                setDialogState(() {
                                  isTestingPing = false;
                                  pingResult = res['message'];
                                });
                              },
                        icon: isTestingPing
                            ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.wifi, size: 14),
                        label: const Text('Test Connection'),
                      ),
                    ],
                  ),
                  if (pingResult != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      pingResult!,
                      style: TextStyle(
                        color: pingResult!.contains('Connected') ? const Color(0xFF10B981) : Colors.redAccent,
                        fontSize: 11,
                      ),
                    ),
                  ],

                  const Divider(color: Color(0xFF2D3A33), height: 24),

                  // Authentication Section
                  const Text('Spendly Account Login:', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  if (widget.apiService.isAuthenticated) ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Logged in as:\n${widget.apiService.userEmail ?? widget.apiService.userName ?? 'Authenticated'}',
                              style: const TextStyle(color: Colors.white, fontSize: 11),
                            ),
                          ),
                          TextButton(
                            onPressed: () async {
                              await widget.apiService.logout();
                              setDialogState(() {});
                              setState(() {});
                            },
                            child: const Text('Log Out', style: TextStyle(color: Colors.redAccent, fontSize: 11)),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 6),
                    TextField(
                      controller: emailController,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      decoration: InputDecoration(
                        hintText: 'Email address',
                        hintStyle: const TextStyle(color: Colors.white30),
                        filled: true,
                        fillColor: const Color(0xFF121715),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2D3A33))),
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: passController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      decoration: InputDecoration(
                        hintText: 'Password',
                        hintStyle: const TextStyle(color: Colors.white30),
                        filled: true,
                        fillColor: const Color(0xFF121715),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2D3A33))),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      ),
                      onPressed: isLoggingIn
                          ? null
                          : () async {
                              setDialogState(() => isLoggingIn = true);
                              await widget.apiService.setBaseUrl(urlController.text.trim());
                              final res = await widget.apiService.login(emailController.text.trim(), passController.text);
                              setDialogState(() => isLoggingIn = false);
                              if (res['success'] == true) {
                                if (mounted) {
                                  setState(() {});
                                  _refreshData();
                                }
                              } else {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Login failed: ${res['message']}'), backgroundColor: Colors.redAccent),
                                  );
                                }
                              }
                            },
                      icon: isLoggingIn
                          ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                          : const Icon(Icons.login, size: 14),
                      label: const Text('Log In to Sync', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],

                  const Divider(color: Color(0xFF2D3A33), height: 24),

                  // Test simulation data button
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white70,
                      side: const BorderSide(color: Color(0xFF2D3A33)),
                    ),
                    onPressed: () {
                      Navigator.pop(dialogContext);
                      _executeSmsSync(useSimulatedFallback: true);
                    },
                    icon: const Icon(Icons.science_outlined, size: 16),
                    label: const Text('Load Sample M-Pesa Test SMS', style: TextStyle(fontSize: 11)),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Close', style: TextStyle(color: Colors.white54)),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.black),
                onPressed: () async {
                  await widget.apiService.setBaseUrl(urlController.text.trim());
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }
                  _refreshData();
                },
                child: const Text('Save URL'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _presetChip(String label, String url, TextEditingController controller, StateSetter setDialogState) {
    return InkWell(
      onTap: () {
        setDialogState(() {
          controller.text = url;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFF121715),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: const Color(0xFF2D3A33)),
        ),
        child: Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOnline = widget.apiService.isAuthenticated;

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
              _buildStatusBar(isOnline),
              const SizedBox(height: 12),
              _buildSyncCard(),
              const SizedBox(height: 16),
              _buildStatsGrid(),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Scanned M-Pesa Records',
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

  Widget _buildStatusBar(bool isOnline) {
    return InkWell(
      onTap: _showSettingsDialog,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isOnline ? const Color(0xFF10B981).withValues(alpha: 0.1) : Colors.amber.shade900.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isOnline ? const Color(0xFF10B981).withValues(alpha: 0.3) : Colors.amber.shade700.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          children: [
            Icon(
              isOnline ? Icons.cloud_done : Icons.cloud_off,
              color: isOnline ? const Color(0xFF10B981) : Colors.amber,
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isOnline
                    ? 'Connected to server: ${widget.apiService.userEmail ?? widget.apiService.baseUrl}'
                    : 'Offline / Local Mode (SMS saved on device) — Tap to connect & login',
                style: TextStyle(
                  color: isOnline ? const Color(0xFF10B981) : Colors.amber.shade200,
                  fontSize: 11,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white38, size: 16),
          ],
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
                _isSyncing ? 'Scanning Inbox...' : 'Scan & Sync M-Pesa SMS',
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
        _buildStatTile('Total Scanned', _transactions.length, const Color(0xFF10B981)),
        const SizedBox(width: 8),
        _buildStatTile('Server Synced', _stats['imported'] ?? 0, Colors.blueAccent),
        const SizedBox(width: 8),
        _buildStatTile('Duplicates', _stats['duplicates'] ?? 0, Colors.amber),
        const SizedBox(width: 8),
        _buildStatTile('Local Only', _transactions.where((t) => t.status != 'synced' && t.status != 'imported').length, Colors.tealAccent),
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
              style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white54, fontSize: 9),
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
    final isSynced = tx.status == 'synced' || tx.status == 'imported';

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
                    const Spacer(),
                    // Sync badge
                    Icon(
                      isSynced ? Icons.cloud_done : Icons.phone_android,
                      size: 13,
                      color: isSynced ? const Color(0xFF10B981) : Colors.amber,
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  tx.counterparty.isNotEmpty
                      ? tx.counterparty
                      : (tx.recipient.isNotEmpty ? tx.recipient : (tx.sender.isNotEmpty ? tx.sender : tx.rawMessage)),
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
      child: Column(
        children: [
          const Icon(Icons.inbox_outlined, color: Colors.white24, size: 48),
          const SizedBox(height: 12),
          const Text(
            'No M-Pesa Transactions Yet',
            style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap "Scan & Sync M-Pesa SMS" above to read your inbox.\nIf using an emulator without real SMS, tap below to test with sample data.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white38, fontSize: 11),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF10B981),
              side: const BorderSide(color: Color(0xFF10B981)),
            ),
            onPressed: () => _executeSmsSync(useSimulatedFallback: true),
            icon: const Icon(Icons.science, size: 14),
            label: const Text('Load Sample M-Pesa SMS', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
