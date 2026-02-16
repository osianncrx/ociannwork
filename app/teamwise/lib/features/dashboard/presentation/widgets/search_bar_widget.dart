import 'dart:ui';

import '../../../../config.dart';

class SearchBarWidget extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onClear;
  final FocusNode? focusNode;
  final String? hintText;

  const SearchBarWidget({
    super.key,
    required this.controller,
    this.onChanged,
    this.onClear,
    this.focusNode,
    this.hintText,
  });

  @override
  Widget build(BuildContext context) {
    return TextFieldCommon(
      hintText: hintText ?? appFonts.startMessaging,
      hintStyle: appCss.dmSansMedium14.textColor(
        appColor(context).gray /* .withValues(alpha: 0.63) */,
      ),
      keyboardType: TextInputType.name,
      focusNode: focusNode,
      fillColor: appColor(context).white,
      prefixIcon: svgAssets.search,
      prefixColor: appColor(context).gray.withValues(alpha: 0.63),
      controller: controller,
      onChanged: onChanged,
      borderColor: appColor(context).white,
      border: InputBorder.none,
      onFieldSubmitted: (_) => focusNode?.unfocus(), // Add this
    ) /* .boxDecoration() */ .padding(
      horizontal: Sizes.s20,
      vertical: Sizes.s12,
    );
  }
}

class GlassSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onClear;
  final FocusNode? focusNode;
  final String? hintText;
  GlassSearchBar({
    super.key,
    required this.controller,
    this.onChanged,
    this.onClear,
    this.focusNode,
    this.hintText,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            margin: EdgeInsets.symmetric(horizontal: Sizes.s20),
            height: 45,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
            ),
            child: Row(
              children: [
                SvgPicture.asset(
                  svgAssets.search,
                  color: Colors.white,
                ).paddingDirectional(horizontal: Sizes.s13),
                /*  const Icon(Icons.search, color: Colors.white70, size: 22), */
                /* const SizedBox(width: 10), */
                Expanded(
                  child: TextField(
                    onChanged: onChanged,
                    focusNode: focusNode,
                    keyboardType: TextInputType.name,
                    controller: controller,

                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: hintText ?? appFonts.startMessaging,
                      hintStyle: appCss.dmSansMedium14.textColor(
                        appColor(context).gray /* .withValues(alpha: 0.63) */,
                      ),

                      /*   prefixIcon: SvgPicture.asset(
                        svgAssets.search,
                        color: Colors.white,
                      ).paddingDirectional(horizontal: Sizes.s13), */
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
