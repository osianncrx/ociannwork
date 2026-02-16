import 'dart:ui';

import 'package:teamwise/config.dart';

class GlassButton extends StatelessWidget {
  final String icon;
  final double? width;
  final double? height;
  final VoidCallback onTap;
  final Color? color;

  const GlassButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.height,
    this.width,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: Container(
            width: width ?? Sizes.s42,
            height: height ?? Sizes.s42,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: appColor(context).white.withValues(alpha: 0.3),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.white.withValues(alpha: 0.15),
                  blurRadius: 10,
                  offset: const Offset(-3, -3),
                ),
              ],
            ),
            child: Center(
              child: SvgPicture.asset(
                icon.toString(),
                colorFilter: ColorFilter.mode(
                  color ?? appColor(context).black.withValues(alpha: 0.8),
                  BlendMode.srcIn,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
