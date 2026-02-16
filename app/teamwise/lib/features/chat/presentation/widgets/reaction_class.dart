import '../../../../config.dart';

class MessageReactionPicker extends StatefulWidget {
  final String messageId;
  final Function(String, String) onReactionSelected;
  final Function onClose;

  const MessageReactionPicker({
    super.key,
    required this.messageId,
    required this.onReactionSelected,
    required this.onClose,
  });

  @override
  State<MessageReactionPicker> createState() => _MessageReactionPickerState();
}

class _MessageReactionPickerState extends State<MessageReactionPicker> {
  final List<String> _reactions = ['👍', '❤️', '😂', '😮', '😢', '😠'];

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        padding: EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 10,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: _reactions.map((emoji) {
            return GestureDetector(
              onTap: () {
                widget.onReactionSelected(widget.messageId, emoji);
              },
              child: Container(
                margin: EdgeInsets.symmetric(horizontal: 4),
                // padding: EdgeInsets.all(8),
                child: Text(
                  emoji,
                  style: TextStyle(fontSize: 20),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}