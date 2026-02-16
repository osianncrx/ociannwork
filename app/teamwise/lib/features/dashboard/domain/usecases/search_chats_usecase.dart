import 'package:teamwise/config.dart';


class SearchChatsUseCase {
  final DashRepository repository;
  SearchChatsUseCase(this.repository);

  Future<List<MessageModel>> call(String query) async {
    return await repository.searchChatsFromApi(query);
  }
}
