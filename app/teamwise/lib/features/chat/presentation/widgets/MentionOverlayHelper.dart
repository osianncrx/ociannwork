import '../../../../config.dart';
import '../../data/models/channel_info_model.dart';

class MentionOverlayHelper {
  OverlayEntry? _overlayEntry;
  final List<int> _mentionedUserIds = [];
  List<int> get mentionedUserIds => List.unmodifiable(_mentionedUserIds);
  List<String> get mentionedUserNames => _mentionedUsers.values.toList();
  bool _isShowing = false;
  final Map<int, String> _mentionedUsers = {}; // userId -> username

  void handleMentionTrigger(BuildContext context, String text, TextEditingController controller,
      List<ChannelMember> members, Function(ChannelMember) onSelect) {
    if (text.endsWith('@')) {
      showOverlay(context, members, controller, onSelect);
    } else if (!text.contains('@')) {
      hideOverlay();
    }
  }
  void clearMentionedUsers() {
    _mentionedUserIds.clear();
    _mentionedUsers.clear();
  }
  // Add a user to the mentions
  void addMentionedUser(int userId, String name) {
    if (!_mentionedUserIds.contains(userId)) {
      _mentionedUserIds.add(userId);
      _mentionedUsers[userId] = name;
    }
  }
  // NEW: add multiple users at once
  void addMentionedUsers(List<int> ids, List<String> names) {
    for (int i = 0; i < ids.length; i++) {
      addMentionedUser(ids[i], names[i]);
    }
  }


  void clear() {
    _mentionedUsers.clear();
  }
  void insertMention(TextEditingController controller, String mentionText, String userId) {
    final text = controller.text;
    final cursorPos = controller.selection.baseOffset;
    final newText = text.replaceRange(cursorPos - 1, cursorPos, mentionText);
    controller.text = newText;
    controller.selection = TextSelection.collapsed(offset: newText.length);
    mentionedUserIds.add(int.parse(userId));
    hideOverlay();
  }

  void showOverlay(BuildContext context, List<ChannelMember> members,
      TextEditingController controller, Function(ChannelMember) onSelect) {
    if (_isShowing) hideOverlay();

    final overlay = Overlay.of(context);
    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        left: 20,
        right: 20,
        bottom: 80,
        child: Material(
          elevation: 8,
          borderRadius: BorderRadius.circular(8),
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: members.length,
            itemBuilder: (context, index) {
              final member = members[index];
              return ListTile(
                leading: CircleAvatar(backgroundColor: Colors.blueAccent),
                title: Text(member.user.name),
                onTap: () => onSelect(member),
              );
            },
          ),
        ),
      ),
    );
    overlay.insert(_overlayEntry!);
    _isShowing = true;
  }

  void hideOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    _isShowing = false;
  }

  Widget buildOverlayWidget() => const SizedBox.shrink();

  void clearMentions() {
    mentionedUserIds.clear();
  }
}
