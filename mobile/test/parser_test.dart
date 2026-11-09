import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/mpesa_local_parser.dart';

void main() {
  group('MpesaLocalParser Tests', () {
    test('parses sent money transaction correctly', () {
      const sms = 'QK87XYZ123 Confirmed. Ksh1,500.00 sent to JOHN DOE 254712345678 on 28/10/26 at 10:30 AM. Fee: Ksh25.00. Balance: Ksh5,420.00';
      final tx = MpesaLocalParser.parse(sms);

      expect(tx, isNotNull);
      expect(tx!.transactionRef, 'QK87XYZ123');
      expect(tx.amount, 1500.00);
      expect(tx.fee, 25.00);
      expect(tx.balance, 5420.00);
      expect(tx.counterparty, 'JOHN DOE');
      expect(tx.transactionType, 'sent');
    });

    test('parses buy goods (till) transaction correctly', () {
      const sms = 'QK88ABC456 Confirmed. Ksh2,400.00 paid to NAIVAS SUPERMARKET till 123456 on 27/10/26 at 2:15 PM. Fee: Ksh0.00. Balance: Ksh3,020.00';
      final tx = MpesaLocalParser.parse(sms);

      expect(tx, isNotNull);
      expect(tx!.transactionRef, 'QK88ABC456');
      expect(tx.amount, 2400.00);
      expect(tx.fee, 0.00);
      expect(tx.balance, 3020.00);
      expect(tx.counterparty, 'NAIVAS SUPERMARKET');
      expect(tx.transactionType, 'buy_goods');
    });

    test('parses paybill transaction correctly', () {
      const sms = 'QK89DEF789 Confirmed. Ksh800.00 paid to KENYA POWER paybill 888880 on 26/10/26 at 9:00 AM. Fee: Ksh0.00. Balance: Ksh2,220.00';
      final tx = MpesaLocalParser.parse(sms);

      expect(tx, isNotNull);
      expect(tx!.transactionRef, 'QK89DEF789');
      expect(tx.amount, 800.00);
      expect(tx.counterparty, 'KENYA POWER');
      expect(tx.transactionType, 'paybill');
    });

    test('parses received money correctly', () {
      const sms = 'QK90GHI012 Confirmed. You have received Ksh5,000.00 from SARAH JANE 254799887766 on 25/10/26 at 6:45 PM. Balance: Ksh7,220.00';
      final tx = MpesaLocalParser.parse(sms);

      expect(tx, isNotNull);
      expect(tx!.transactionRef, 'QK90GHI012');
      expect(tx.amount, 5000.00);
      expect(tx.counterparty, 'SARAH JANE');
      expect(tx.transactionType, 'received');
    });

    test('parses airtime purchase correctly', () {
      const sms = 'QK91JKL345 Confirmed. You bought Ksh100.00 of airtime on 24/10/26 at 11:00 AM. Balance: Ksh1,200.00';
      final tx = MpesaLocalParser.parse(sms);

      expect(tx, isNotNull);
      expect(tx!.transactionRef, 'QK91JKL345');
      expect(tx.amount, 100.00);
      expect(tx.counterparty, 'Safaricom Airtime');
      expect(tx.transactionType, 'airtime');
    });

    test('returns null for non-mpesa messages', () {
      const sms = 'Hey, are we still meeting today at 5pm?';
      final tx = MpesaLocalParser.parse(sms);
      expect(tx, isNull);
    });
  });
}

