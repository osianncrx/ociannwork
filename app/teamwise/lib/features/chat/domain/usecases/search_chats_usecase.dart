import '../entities/chat_user_entity.dart';
import '../repositories/chat_repository.dart';

class SearchChatsUseCase {
  final DashRepository repository;
  SearchChatsUseCase(this.repository);

  Future<List<dynamic>> call(String query) async {
    return await repository.searchChatsFromApi(query);
  }
}
