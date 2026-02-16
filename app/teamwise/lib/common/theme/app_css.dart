import '../../config.dart';

part 'scale.dart';

TextStyle dmSans({double? fontsize, fontWeight}) =>
    GoogleFonts.dmSans(fontSize: fontsize, fontWeight: fontWeight);

FontWeight thin = FontWeight.w100;
FontWeight extraLight = FontWeight.w200;
FontWeight light = FontWeight.w300;
FontWeight regular = FontWeight.normal;
FontWeight medium = FontWeight.w500;
FontWeight semiBold = FontWeight.w600;
FontWeight bold = FontWeight.w700;
FontWeight extraBold = FontWeight.w800;
FontWeight black = FontWeight.w900;
FontWeight extraThickBold = FontWeight.bold;

class AppCss {
  //Regular w400
  TextStyle dmSansRegular12 = dmSans(
    fontWeight: regular,
    fontsize: FontSizes.f12,
  );
  TextStyle dmSansRegular14 = dmSans(
    fontWeight: regular,
    fontsize: FontSizes.f14,
  );
  TextStyle dmSansRegular16 = dmSans(
    fontWeight: regular,
    fontsize: FontSizes.f16,
  );

  //Medium w500
  TextStyle dmSansMedium44 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f40,
  );
  TextStyle dmSansMedium28 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f28,
  );
  TextStyle dmSansMedium24 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f24,
  );
  TextStyle dmSansMedium22 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f22,
  );
  TextStyle dmSansMedium20 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f20,
  );
  TextStyle dmSansMedium18 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f18,
  );
  TextStyle dmSansMedium16 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f16,
  );
  TextStyle dmSansMedium15 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f15,
  );
  TextStyle dmSansMedium14 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f14,
  );
  TextStyle dmSansMedium13 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f13,
  );
  TextStyle dmSansMedium12 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f12,
  );
  TextStyle dmSansMedium11 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f11,
  );
  TextStyle dmSansMedium10 = dmSans(
    fontWeight: medium,
    fontsize: FontSizes.f10,
  );
  TextStyle dmSansMedium8 = dmSans(fontWeight: medium, fontsize: FontSizes.f8);

  //semi Bold w600
  TextStyle dmSansSemiBold14 = dmSans(
    fontWeight: semiBold,
    fontsize: FontSizes.f14,
  );  TextStyle dmSansSemiBold15 = dmSans(
    fontWeight: semiBold,
    fontsize: FontSizes.f15,
  );
  TextStyle dmSansSemiBold16 = dmSans(
    fontWeight: semiBold,
    fontsize: FontSizes.f16,
  );
  TextStyle dmSansSemiBold18 = dmSans(
    fontWeight: semiBold,
    fontsize: FontSizes.f18,
  );
  TextStyle dmSansSemiBold20 = dmSans(
    fontWeight: semiBold,
    fontsize: FontSizes.f20,
  );
  TextStyle dmSansSemiBold30 = dmSans(
    fontWeight: semiBold,
    fontsize: FontSizes.f30,
  );
  //Bold w700
  TextStyle dmSansBold12 = dmSans(fontWeight: bold, fontsize: FontSizes.f12);
  TextStyle dmSansBold16 = dmSans(fontWeight: bold, fontsize: FontSizes.f16);
  TextStyle dmSansBold19 = dmSans(fontWeight: bold, fontsize: FontSizes.f19);
  //Extra Bold w800
  TextStyle dmSansExtraBold18 = dmSans(
    fontWeight: bold,
    fontsize: FontSizes.f18,
  );
}
