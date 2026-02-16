import 'package:teamwise/common/widgets/country_picker_custom/country_picker_custom.dart';
import 'package:teamwise/common/widgets/country_picker_custom/country_code_custom.dart';
import 'package:teamwise/common/widgets/country_picker_custom/layouts/country_theme.dart' as custom;
import 'package:flutter/cupertino.dart';
import '../../../../config.dart';

class CountryListLayout extends StatelessWidget {
  final Function(CountryCodeCustom?)? onChanged;
  final String? initialSelection;

  const CountryListLayout({super.key, this.onChanged, this.initialSelection});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: Sizes.s50,
      child: CountryListPickCustom(
        appBar: AppBar(
          centerTitle: true,
          title: Text(
            appFonts.selectCountry,
            style: appCss.dmSansSemiBold16.copyWith(color: Colors.white),
          ),
          elevation: 0,
          backgroundColor: appColor(context).primary,
        ),
        countryBuilder: (context, countryCode) => Container(
          height: 50,
          color: appColor(context).screenBg,
          child: Material(
            color: Colors.transparent,
            child: ListTile(
              leading: Image.asset(
                "${countryCode.flagUri}",
                width: Sizes.s22,
                height: Sizes.s16,
              ),
              title: Text(
                countryCode.name!,
                style: appCss.dmSansRegular12.textColor(
                  appColor(context).darkText,
                ),
              ),
              onTap: () {
                Navigator.pop(context, countryCode);
              },
            ),
          ),
        ),
        pickerBuilder: (context, CountryCodeCustom? countryCode) {
          return Row(
            children: [
              Text(
                countryCode!.dialCode.toString(),
                style: appCss.dmSansMedium14.textColor(
                  appColor(context).darkText,
                ),
              ).paddingSymmetric(horizontal: Insets.i5),
              Icon(
                CupertinoIcons.chevron_down,
                size: Sizes.s16,
                color: appColor(context).darkText,
              ),
            ],
          );
        },
        theme: custom.CountryTheme(
          isShowCode: true,
          isShowTitle: true,
          alphabetSelectedBackgroundColor: appColor(context).primary,
          labelColor: appColor(context).darkText,
          alphabetTextColor: appColor(context).lightText,
          alphabetSelectedTextColor: appColor(context).commonButtonText,
          searchText: language(context, appFonts.search),
          searchHintText: language(context, appFonts.typeHere),

          lastPickText: "Last Picked",
        ),
        initialSelection: initialSelection ?? '+1',
        onChanged: onChanged,
      ),
    ).decorated(
      color: appColor(context).white,
      borderRadius: BorderRadius.all(Radius.circular(AppRadius.r30)),
      border: Border.all(
        color: isDark(context)
            ? appColor(context).gray.withValues(alpha: 0.2)
            : appColor(context).textFiledBorder,
      ),
    );
  }
}
