import 'package:teamwise/config.dart';

abstract class DashRepository {
  Future<List<MessageModel>> fetchChatsFromApi();
  Future<List<MessageModel>> searchChatsFromApi(String query); // <-- add this
}
