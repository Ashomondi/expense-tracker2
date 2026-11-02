class MpesaTransaction {
  final int? id;
  final String transactionRef;
  final String transactionType;
  final double amount;
  final double fee;
  final double balance;
  final String recipient;
  final String sender;
  final String phoneNumber;
  final DateTime transactionDate;
  final String status;
  final String rawMessage;

  MpesaTransaction({
    this.id,
    required this.transactionRef,
    required this.transactionType,
    required this.amount,
    this.fee = 0.0,
    this.balance = 0.0,
    this.recipient = '',
    this.sender = '',
    this.phoneNumber = '',
    required this.transactionDate,
    this.status = 'imported',
    required this.rawMessage,
  });

  factory MpesaTransaction.fromJson(Map<String, dynamic> json) {
    return MpesaTransaction(
      id: json['id'],
      transactionRef: json['transaction_ref'] ?? '',
      transactionType: json['transaction_type'] ?? 'unknown',
      amount: (json['amount'] is num) ? (json['amount'] as num).toDouble() : 0.0,
      fee: (json['fee'] is num) ? (json['fee'] as num).toDouble() : 0.0,
      balance: (json['balance'] is num) ? (json['balance'] as num).toDouble() : 0.0,
      recipient: json['recipient'] ?? '',
      sender: json['sender'] ?? '',
      phoneNumber: json['phone_number'] ?? '',
      transactionDate: json['transaction_date'] != null
          ? DateTime.tryParse(json['transaction_date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      status: json['status'] ?? 'imported',
      rawMessage: json['raw_message'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'transaction_ref': transactionRef,
      'transaction_type': transactionType,
      'amount': amount,
      'fee': fee,
      'balance': balance,
      'recipient': recipient,
      'sender': sender,
      'phone_number': phoneNumber,
      'transaction_date': transactionDate.toIso8601String().split('T').first,
      'raw_message': rawMessage,
      'currency': 'KES',
    };
  }
}
