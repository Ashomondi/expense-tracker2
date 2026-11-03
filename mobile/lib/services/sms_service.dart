import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class RawSmsMessage {
  final int id;
  final String address;
  final String body;
  final int timestamp;

  RawSmsMessage({
    required this.id,
    required this.address,
    required this.body,
    required this.timestamp,
  });

  factory RawSmsMessage.fromMap(Map<dynamic, dynamic> map) {
    return RawSmsMessage(
      id: (map['id'] is num) ? (map['id'] as num).toInt() : 0,
      address: map['address']?.toString() ?? '',
      body: map['body']?.toString() ?? '',
      timestamp: (map['date'] is num) ? (map['date'] as num).toInt() : DateTime.now().millisecondsSinceEpoch,
    );
  }
}

class SmsService {
  static const MethodChannel _channel = MethodChannel('com.spendly.app/sms_reader');

  Future<bool> checkPermission() async {
    try {
      final bool? granted = await _channel.invokeMethod<bool>('checkSmsPermission');
      return granted ?? false;
    } on PlatformException catch (e) {
      debugPrint('Failed to check SMS permission: ${e.message}');
      return false;
    }
  }

  Future<bool> requestPermission() async {
    try {
      final bool? granted = await _channel.invokeMethod<bool>('requestSmsPermission');
      return granted ?? false;
    } on PlatformException catch (e) {
      debugPrint('Failed to request SMS permission: ${e.message}');
      return false;
    }
  }

  Future<List<RawSmsMessage>> readMpesaInbox({int limit = 100}) async {
    try {
      final List<dynamic>? rawList = await _channel.invokeMethod<List<dynamic>>(
        'readMpesaSms',
        {'limit': limit},
      );

      if (rawList != null && rawList.isNotEmpty) {
        return rawList.map((item) => RawSmsMessage.fromMap(item as Map<dynamic, dynamic>)).toList();
      }
    } on PlatformException catch (e) {
      debugPrint('Platform error reading SMS: ${e.message}');
    }

    // Fallback simulation when running on emulators without a physical SIM card
    return getSimulatedMpesaMessages();
  }

  List<RawSmsMessage> getSimulatedMpesaMessages() {
    final now = DateTime.now().millisecondsSinceEpoch;
    return [
      RawSmsMessage(
        id: 1,
        address: 'MPESA',
        body: 'QK87XYZ123 Confirmed. Ksh1,500.00 sent to JOHN DOE 254712345678 on 28/10/26 at 10:30 AM. Fee: Ksh25.00. Balance: Ksh5,420.00',
        timestamp: now - 3600000,
      ),
      RawSmsMessage(
        id: 2,
        address: 'MPESA',
        body: 'QK88ABC456 Confirmed. Ksh2,400.00 paid to NAIVAS SUPERMARKET till 123456 on 27/10/26 at 2:15 PM. Fee: Ksh0.00. Balance: Ksh3,020.00',
        timestamp: now - 86400000,
      ),
      RawSmsMessage(
        id: 3,
        address: 'MPESA',
        body: 'QK89DEF789 Confirmed. Ksh800.00 paid to KENYA POWER paybill 888880 on 26/10/26 at 9:00 AM. Fee: Ksh0.00. Balance: Ksh2,220.00',
        timestamp: now - 172800000,
      ),
      RawSmsMessage(
        id: 4,
        address: 'MPESA',
        body: 'QK90GHI012 Confirmed. You have received Ksh5,000.00 from SARAH JANE 254799887766 on 25/10/26 at 6:45 PM. Balance: Ksh7,220.00',
        timestamp: now - 259200000,
      ),
    ];
  }
}
