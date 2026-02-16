import '../repositories/chat_repository.dart';

class GetChatsUseCase {
  final DashRepository repository;
  GetChatsUseCase(this.repository);

  Future<List<dynamic>> call() async {
    return await repository.fetchChatsFromApi();
  }
}
