import '../config.dart';

class AppArray {
  /// Your local fallback list
  List<LanguageModel> getDefaultLanguages() => [
    LanguageModel(name: 'English', code: 'en'),
    LanguageModel(name: 'French', code: 'fr'),
    LanguageModel(name: 'Hindi', code: 'hi'),
    LanguageModel(name: 'Arabic', code: 'ar', isRtl: true),
  ];
  get currencyList => [
    {
      "id": 1,
      "code": "USD",
      "symbol": "\$",
      "no_of_decimal": "2.00",
      "exchange_rate": "1.00",
      "thousands_separator": "comma",
      "decimal_separator": "comma",
      "system_reserve": "0",
      "status": "1",
      "created_by_id": null,
      "created_at": "2023-09-08T16:55:08.000000Z",
      "updated_at": "2023-11-13T03:43:17.000000Z",
      "deleted_at": null,
      "title": appFonts.usDollar,
    },
    {
      "id": 2,
      "code": "INR",
      "symbol": "₹",
      "no_of_decimal": "2.00",
      "exchange_rate": "83.24",
      "thousands_separator": "comma",
      "decimal_separator": "comma",
      "system_reserve": "1",
      "status": "1",
      "created_by_id": null,
      "created_at": "2023-09-08T16:55:08.000000Z",
      "updated_at": "2023-11-13T03:43:17.000000Z",
      "deleted_at": null,
      "title": appFonts.inr,
    },
    {
      "id": 3,
      "code": "GBP",
      "symbol": "£",
      "no_of_decimal": "2.00",
      "exchange_rate": "100.00",
      "thousands_separator": "comma",
      "decimal_separator": "comma",
      "system_reserve": "0",
      "status": "1",
      "created_by_id": null,
      "created_at": "2023-09-08T16:55:08.000000Z",
      "updated_at": "2023-09-08T16:55:08.000000Z",
      "deleted_at": null,
      "title": appFonts.pound,
    },
    {
      "id": 4,
      "code": "EUR",
      "symbol": "€",
      "no_of_decimal": "2.00",
      "exchange_rate": "0.01",
      "thousands_separator": "comma",
      "decimal_separator": "comma",
      "system_reserve": "0",
      "status": "1",
      "created_by_id": null,
      "created_at": "2023-09-08T16:55:08.000000Z",
      "updated_at": "2023-09-08T16:55:08.000000Z",
      "deleted_at": null,
      "title": appFonts.euro,
    },
  ];
  get localList => <Locale>[
    const Locale('en'),
    const Locale('ar'),
    const Locale('fr'),
    const Locale('hi'),
  ];

  // language list
  get languageList => [
    {
      "title": appFonts.english,
      "locale": const Locale('en', 'EN'),
      // "icon": eImageAssets.en,
      "code": "en",
    },
    {
      "title": appFonts.arabic,
      "locale": const Locale("ar", 'AE'),
      // "icon": eImageAssets.ar,
      "code": "ar",
    },
    {
      "title": appFonts.french,
      "locale": const Locale('fr', 'FR'),
      // "icon": eImageAssets.fr,
      "code": "fr",
    },
    {
      "title": appFonts.hindi,
      "locale": const Locale("hi", 'HI'),
      // "icon": eImageAssets.es,
      "code": "es",
    },
  ];
  get discoverTeams => [
    {
      "title": "GtratEdge Solutions",
      "subTitle": "esther howard",
      "status": "Join",
    },
    {
      "title": "GtratEdge Solutions",
      "subTitle": "esther howard",
      'status': "Joined",
    },
    {
      "title": "GtratEdge Solutions",
      "subTitle": "esther howard",
      'status': "Requested",
    },
    {
      "title": "GtratEdge Solutions",
      "subTitle": "esther howard",
      'status': "Join",
    },
  ];

  get welcomeTeam => [
    {"name": "Astrolink Corp", "subTitle": "25 Members"},
    {"name": "Veltrix Global", "subTitle": "0 Members"},
    {"name": "Astrolink Corp", "subTitle": "25 Members"},
  ];
  get chatChannel => [
    {
      "title": "Current Project / Initiative",
      "subTitle": "i.e: Mobile app development, marketing",
      "svg": svgAssets.rocket,
    },
    {
      "title": "Latest Client Request / Feature",
      "subTitle": "i.e: Newsletter Module, Language...",
      "svg": svgAssets.client,
    },
    {
      "title": "Learning & Development / Education",
      "subTitle": "i.e: SQL mastery project, full stack...",
      "svg": svgAssets.peoples,
    },
  ];
  get customDetails => [
    {
      "My Lead": ["Robert", "james", "maria", "john"],
      "Contact": ["Robert", "james", "maria"],
      "Technologies i Know": ["Flutter", "Web Design", "UI/UX", "ReactNative"],
      "My T-shirt Size": ["Small", "Medium", "Large"],
    },
  ];
}
