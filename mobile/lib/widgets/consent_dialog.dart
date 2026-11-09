import 'package:flutter/material.dart';

class MpesaConsentDialog extends StatefulWidget {
  final VoidCallback onConsentGranted;

  const MpesaConsentDialog({super.key, required this.onConsentGranted});

  static Future<bool?> show(BuildContext context, {required VoidCallback onConsentGranted}) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => MpesaConsentDialog(onConsentGranted: onConsentGranted),
    );
  }

  @override
  State<MpesaConsentDialog> createState() => _MpesaConsentDialogState();
}

class _MpesaConsentDialogState extends State<MpesaConsentDialog> {
  bool _agreed = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1A1F1C),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFF2D3A33)),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.security, color: Color(0xFF10B981), size: 24),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'M-Pesa SMS Consent',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'To automatically track your expenses, Spendly requests permission to read M-Pesa transaction messages.',
              style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 14),
            _buildFeatureBullet(
              icon: Icons.filter_alt_outlined,
              title: 'Strict Sender Filtering',
              desc: 'Only SMS from "MPESA" are processed. Personal chats are strictly untouched.',
            ),
            const SizedBox(height: 10),
            _buildFeatureBullet(
              icon: Icons.fingerprint,
              title: 'Data Minimization',
              desc: 'Only amounts, receipts, and dates are saved to generate expense insights.',
            ),
            const SizedBox(height: 10),
            _buildFeatureBullet(
              icon: Icons.lock_outline,
              title: 'Encrypted & Private',
              desc: 'Synced directly with your private Spendly backend account.',
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: () {
                setState(() {
                  _agreed = !_agreed;
                });
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                child: Row(
                  children: [
                    Checkbox(
                      value: _agreed,
                      activeColor: const Color(0xFF10B981),
                      checkColor: Colors.black,
                      onChanged: (val) {
                        setState(() {
                          _agreed = val ?? false;
                        });
                      },
                    ),
                    const Expanded(
                      child: Text(
                        'I agree and authorize Spendly to scan M-Pesa SMS for expense tracking.',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            foregroundColor: Colors.black,
            disabledBackgroundColor: Colors.white12,
            disabledForegroundColor: Colors.white30,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          ),
          onPressed: _agreed
              ? () {
                  Navigator.of(context).pop(true);
                  widget.onConsentGranted();
                }
              : null,
          child: const Text('Allow & Sync', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildFeatureBullet({required IconData icon, required String title, required String desc}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF10B981), size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(desc, style: const TextStyle(color: Colors.white60, fontSize: 11)),
            ],
          ),
        ),
      ],
    );
  }
}
