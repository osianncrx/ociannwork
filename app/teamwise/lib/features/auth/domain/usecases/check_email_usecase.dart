import '../entities/check_email_entity.dart';
import '../repositories/auth_repository.dart';

class CheckEmailUseCase {
  final AuthRepository repository;

  CheckEmailUseCase(this.repository);

  Future<CheckEmailEntity> call(String email) {
    return repository.checkEmail(email);
  }
}
