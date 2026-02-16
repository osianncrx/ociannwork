import '../../../../config.dart';
import '../repositories/chat_repository.dart';

class GetChatsUseCase {
  final DashRepository repository;
  GetChatsUseCase(this.repository);

  Future<List<MessageModel>> call() async {
    return await repository.fetchChatsFromApi();
  }
}
