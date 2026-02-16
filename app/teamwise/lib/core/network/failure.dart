// class Failure {
//   final String? message;
//   final int? statusCode;
//   final dynamic data;
//   Failure({this.message, this.data, this.statusCode});
// }
//
// class InPutDataFailure extends Failure {
//   InPutDataFailure({super.message, super.statusCode});
// }
//
// class GetDataFailure extends Failure {
//   GetDataFailure({super.message, super.statusCode});
// }

abstract class Failure {
  final String message;

  Failure(this.message);
}

class ServerFailure extends Failure {
  ServerFailure(String message) : super(message);
}

class NetworkFailure extends Failure {
  NetworkFailure(String message) : super(message);
}

class UnexpectedFailure extends Failure {
  UnexpectedFailure(String message) : super(message);
}
