import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/services/sms_service.dart';

void main() {
  testWidgets('Spendly companion app builds and renders dashboard', (WidgetTester tester) async {
    final apiService = ApiService();
    final smsService = SmsService();

    await tester.pumpWidget(SpendlyCompanionApp(
      apiService: apiService,
      smsService: smsService,
    ));

    expect(find.text('Spendly'), findsOneWidget);
    expect(find.text('M-PESA COMPANION'), findsOneWidget);
  });
}
