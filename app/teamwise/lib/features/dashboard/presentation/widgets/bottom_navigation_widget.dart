import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../config.dart';

class BottomNavigationWidget extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int>? onItemTapped;

  const BottomNavigationWidget({
    super.key,
    this.selectedIndex = 0,
    this.onItemTapped,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(vertical: Sizes.s12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? Colors.transparent
            : appColor(
                context,
              ).bgColor /* Colors.transparent */ /*  appColor(context).bgColor */,
        boxShadow: [
          BoxShadow(
            color: appColor(context).lightText.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(4, (index) => _buildNavItem(index, context)),
      ),
    );
  }

  Widget _buildNavItem(int index, BuildContext context) {
    final navItems = [
      _NavItem(svgAssets.messages, appFonts.chats, routeName.dashboard),
      _NavItem(
        svgAssets.profileUser,
        appFonts.channels,
        routeName.channelsScreen,
      ),
      _NavItem(svgAssets.userTag, appFonts.member, routeName.memberScreen),
      _NavItem(svgAssets.category, appFonts.more, routeName.moreScreen),
    ];
    final item = navItems[index];
    final isSelected = selectedIndex == index;

    return GestureDetector(
      onTap: () => _handleNavigation(index, context),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        transform: Matrix4.identity()..scale(isSelected ? 1.1 : 1.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: SvgPicture.asset(
                item.icon,
                key: ValueKey(isSelected),
                width: Sizes.s24,
                height: Sizes.s24,
                colorFilter: ColorFilter.mode(
                  isSelected
                      ? appColor(context).primary
                      : appColor(context).lightText,
                  BlendMode.srcIn,
                ),
              ),
            ),
            VSpace(Sizes.s5),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style: appCss.dmSansMedium12.textColor(
                isSelected
                    ? appColor(context).primary
                    : appColor(context).lightText,
              ),
              child: Text(item.label),
            ),
          ],
        ),
      ),
    );
  }

  void _handleNavigation(int index, BuildContext context) {
    HapticFeedback.lightImpact();
    if (onItemTapped != null) {
      onItemTapped!(index);
    } else {
      _navigateToScreen(index, context);
    }
  }

  void _navigateToScreen(int index, BuildContext context) {
    final routes = [
      routeName.dashboard,
      routeName.channelsScreen,
      routeName.memberScreen,
      routeName.moreScreen,
    ];
    Navigator.pushNamed(context, routes[index]);
  }
}

class _NavItem {
  final String icon;
  final String label;
  final String route;

  _NavItem(this.icon, this.label, this.route);
}
