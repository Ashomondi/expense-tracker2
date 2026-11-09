import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../models/mpesa_transaction.dart';

class MpesaLocalParser {
  static MpesaTransaction? parse(String rawMessage, {int? id, int? timestamp}) {
    final text = rawMessage.trim();
    if (text.isEmpty) return null;

    final ref = _extractRef(text);
    final amount = _extractAmount(text);
    if (amount <= 0 && ref.isEmpty) {
      return null;
    }

    final type = _detectType(text);
    final counterparty = _extractCounterparty(text, type);
    final balance = _extractBalance(text);
    final fee = _extractFee(text);
    final date = _extractDate(text, timestamp);

    // Compute fingerprint for deduplication
    final fingerprint = sha256.convert(utf8.encode(text)).toString();

    return MpesaTransaction(
      id: id ?? 0,
      transactionRef: ref.isNotEmpty ? ref : fingerprint.substring(0, 10).toUpperCase(),
      transactionType: type,
      amount: amount,
      currency: 'KES',
      sender: type == 'received' || type == 'deposit' ? counterparty : 'You',
      recipient: type == 'sent' || type == 'paybill' || type == 'buy_goods' || type == 'airtime' ? counterparty : 'You',
      counterparty: counterparty,
      balance: balance,
      fee: fee,
      transactionDate: date,
      rawMessage: text,
      status: 'pending',
    );
  }

  static String _extractRef(String text) {
    // Standard M-Pesa confirmation code at start: e.g. "QK87XYZ123 Confirmed." or "SG81AB12CD Confirmed"
    final match = RegExp(r'^([A-Z0-9]{8,12})\s+(?:Confirmed|confirmed)', caseSensitive: false).firstMatch(text);
    if (match != null) {
      return match.group(1)!;
    }

    // Sometimes the reference code is preceded by something or anywhere before Confirmed
    final fallback = RegExp(r'\b([A-Z0-9]{8,12})\s+Confirmed\b', caseSensitive: false).firstMatch(text);
    if (fallback != null) {
      return fallback.group(1)!;
    }
    return '';
  }

  static double _extractAmount(String text) {
    // Patterns: Ksh1,500.00, Ksh. 1,500.00, KSh 500, KES 1,000
    final match = RegExp(r'(?:Ksh|KSh|KES|ksh)\.?\s*([0-9,]+(?:\.[0-9]{2})?)').firstMatch(text);
    if (match != null) {
      final rawNum = match.group(1)!.replaceAll(',', '');
      return double.tryParse(rawNum) ?? 0.0;
    }
    return 0.0;
  }

  static String _detectType(String text) {
    final lower = text.toLowerCase();
    if (lower.contains('sent to')) return 'sent';
    if (lower.contains('paid to') && (lower.contains('paybill') || lower.contains('account'))) return 'paybill';
    if (lower.contains('paid to') || lower.contains('till')) return 'buy_goods';
    if (lower.contains('you have received') || lower.contains('received ksh')) return 'received';
    if (lower.contains('withdraw')) return 'withdrawal';
    if (lower.contains('airtime') || lower.contains('bought airtime')) return 'airtime';
    if (lower.contains('give ksh') || lower.contains('deposit')) return 'deposit';
    return 'expense';
  }

  static String _extractCounterparty(String text, String type) {
    // e.g. "sent to JOHN DOE 254712345678 on"
    final sentMatch = RegExp(r'sent to\s+([A-Z0-9\s\.\-_&]+?)(?:\s+(?:254\d+|\d{10}))?\s+on\b', caseSensitive: false).firstMatch(text);
    if (sentMatch != null) return sentMatch.group(1)!.trim();

    // e.g. "paid to NAIVAS SUPERMARKET till 123456 on" or "paid to KENYA POWER paybill 888880 on"
    final paidMatch = RegExp(r'paid to\s+([A-Z0-9\s\.\-_&]+?)(?:\s+(?:till|paybill|account))', caseSensitive: false).firstMatch(text);
    if (paidMatch != null) return paidMatch.group(1)!.trim();

    // e.g. "received Ksh5,000.00 from SARAH JANE 2547... on"
    final recMatch = RegExp(r'from\s+([A-Z0-9\s\.\-_&]+?)(?:\s+(?:254\d+|\d{10}))?\s+on\b', caseSensitive: false).firstMatch(text);
    if (recMatch != null) return recMatch.group(1)!.trim();

    // e.g. "bought Ksh100 of airtime for 0712345678"
    if (type == 'airtime') return 'Safaricom Airtime';

    return 'M-Pesa Merchant / User';
  }

  static double _extractBalance(String text) {
    final match = RegExp(
      r'(?:Balance|balance|New balance|new balance)[:\s]+(?:is\s+)?(?:Ksh|KSh|KES|ksh)?\.?\s*([0-9,]+(?:\.[0-9]{2})?)',
      caseSensitive: false,
    ).firstMatch(text);
    if (match != null) {
      final raw = match.group(1)!.replaceAll(',', '');
      return double.tryParse(raw) ?? 0.0;
    }
    return 0.0;
  }

  static double _extractFee(String text) {
    final match = RegExp(
      r'(?:Transaction cost|Fee|fee|Cost|cost)[:\s]+(?:is\s+)?(?:Ksh|KSh|KES|ksh)?\.?\s*([0-9,]+(?:\.[0-9]{2})?)',
      caseSensitive: false,
    ).firstMatch(text);
    if (match != null) {
      final raw = match.group(1)!.replaceAll(',', '');
      return double.tryParse(raw) ?? 0.0;
    }
    return 0.0;
  }

  static DateTime _extractDate(String text, int? timestamp) {
    if (timestamp != null && timestamp > 0) {
      return DateTime.fromMillisecondsSinceEpoch(timestamp);
    }
    // Pattern: on 28/10/26 at 10:30 AM
    final match = RegExp(r'on\s+(\d{1,2}/\d{1,2}/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)', caseSensitive: false).firstMatch(text);
    if (match != null) {
      try {
        final datePart = match.group(1)!;
        final parts = datePart.split('/');
        final day = int.parse(parts[0]);
        final month = int.parse(parts[1]);
        var year = int.parse(parts[2]);
        if (year < 100) year += 2000;
        return DateTime(year, month, day);
      } catch (_) {}
    }
    return DateTime.now();
  }
}
