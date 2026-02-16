import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../data/datasources/auth_api.dart';

class PageContentScreen extends StatefulWidget {
  final String slug; // ✅ only slug now
  const PageContentScreen({super.key, required this.slug});

  @override
  State<PageContentScreen> createState() => _PageContentScreenState();
}

class _PageContentScreenState extends State<PageContentScreen> {
  Map<String, dynamic>? pageData;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPageData();
  }

  Future<void> _loadPageData() async {
    try {
      final authApi = serviceLocator<AuthApi>();
      await authApi.settingsApi(); // fetch settings (includes pages)
      final pages = authApi.pages;

      if (pages != null) {
        final matched = pages.firstWhere(
              (page) => page['slug'] == widget.slug,
          orElse: () => {},
        );

        if (matched.isNotEmpty) {
          setState(() {
            pageData = matched;
            isLoading = false;
          });
        } else {
          setState(() {
            isLoading = false;
          });
        }
      }
    } catch (e) {
      setState(() {
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        backgroundColor: appColor(context).bgColor,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (pageData == null || pageData!.isEmpty) {
      return Scaffold(
        backgroundColor: appColor(context).bgColor,
        appBar: AppBar(
          title: const Text("Page Not Found"),
        ),
        body: const Center(child: Text("No page data found.")),
      );
    }

    return Scaffold(
      backgroundColor: appColor(context).bgColor,
      appBar: AppBar(
        backgroundColor: appColor(context).bgColor,
        title: Text(
          pageData?['title'] ?? '',
          style: appCss.dmSansSemiBold16.textColor(appColor(context).darkText),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Html(
          data: pageData?['content'] ?? '',
          style: {
            "body": Style(
              color: appColor(context).darkText,
              fontSize: FontSize(15),
              fontFamily: 'DmSans',
            ),
          },
        ),
      ),
    );
  }
}
