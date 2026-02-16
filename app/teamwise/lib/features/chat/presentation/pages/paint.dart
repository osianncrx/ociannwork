import '../../../../config.dart';
import '../../data/models/chat_message_model.dart';

class CustomChatBubble extends CustomPainter {
  final Color color;
  final bool isOwn;

  CustomChatBubble({required this.color, required this.isOwn});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(15),
    );
    canvas.drawRRect(rrect, paint);

    final tail = Path();
    if (isOwn) {
      tail
        ..moveTo(size.width - 6, size.height - 4)
        ..quadraticBezierTo(
          size.width + 2,
          size.height,
          size.width + 5,
          size.height - 4,
        )
        ..quadraticBezierTo(
          size.width + 3,
          size.height - 5,
          size.width,
          size.height - 12,
        );
    } else {
      tail
        ..moveTo(6, size.height - 4)
        ..quadraticBezierTo(-3, size.height, -10, size.height - 4)
        ..quadraticBezierTo(-3, size.height - 5, 0, size.height - 12);
    }
    canvas.drawPath(tail, paint);
  }

  @override
  bool shouldRepaint(covariant CustomChatBubble old) =>
      old.color != color || old.isOwn != isOwn;
}
