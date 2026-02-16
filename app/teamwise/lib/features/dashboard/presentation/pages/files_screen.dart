
import 'dart:developer';
import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:teamwise/core/network/app_constants.dart';
import 'package:teamwise/features/chat/presentation/pages/chat_screen.dart';
import 'package:teamwise/features/chat/presentation/widgets/chats_layouts.dart';
import 'package:teamwise/features/chat/presentation/widgets/video_playerScreen.dart';
import 'package:video_thumbnail/video_thumbnail.dart';
import 'package:dropdown_button2/dropdown_button2.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../data/datasources/dashboard_Api.dart';
import '../../data/models/files_model.dart';

class FilesScreen extends StatefulWidget {
  const FilesScreen({super.key});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> {
  List<MessageModel> chats = [];
  bool isLoading = false;
  String? selectedChatKey;
  Future<FilesData>? _filesFuture;
  final TextEditingController searchController = TextEditingController();

  // Which type is currently visible
  String selectedType = "image"; // "image", "video", "file"

  @override
  void initState() {
    super.initState();
    _loadChats();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  Future<void> _loadChats() async {
    try {
      setState(() => isLoading = true);
      final data = await DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).fetchChats();
      setState(() => chats = data);
      log("✅ Loaded ${data.length} chats");
    } catch (e) {
      log("❌ Error fetching chats: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<FilesData> fetchFilesData({
    String? channelId,
    String? recipientId,
  }) async {
    return await DashboardApi(
      serviceLocator<ApiManager>(),
      serviceLocator<AuthBloc>(),
    ).fetchFiles(channelId: channelId, recipientId: recipientId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [appColor(context).commonBgColor, appColor(context).white],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 🔹 Header
              Row(
                children: [
                  SvgPicture.asset(
                    svgAssets.arrowLeft,
                    color: appColor(context).black,
                  ).inkWell(onTap: () => route.pop(context)),
                  HSpace(Sizes.s7),
                  Text(
                    "Files",
                    style: appCss.dmSansMedium20.textColor(
                      appColor(context).black,
                    ),
                  ),
                ],
              ).padding(horizontal: Sizes.s20, top: Sizes.s24),
              // 🔹 Searchable Dropdown
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 20,
                ),
                child: isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : DropdownButtonHideUnderline(
                        child: DropdownButton2<String>(
                          isExpanded: true,
                          hint: Text(
                            'Select Conversation',
                            style: TextStyle(
                              fontSize: 14,
                              color: Theme.of(context).hintColor,
                            ),
                          ),
                          items: chats.map((chat) {
                            final value = chat.channelId ?? chat.recipientId;
                            final type = chat.chatType ?? '';
                            return DropdownMenuItem<String>(
                              value: '$type-$value',
                              child: Text(
                                chat.name ?? 'Unknown Chat',
                                style: appCss.dmSansMedium14.textColor(
                                  appColor(context).black,
                                ),
                              ),
                            );
                          }).toList(),
                          value: selectedChatKey,
                          onChanged: (val) {
                            if (val == null) return;
                            setState(() => selectedChatKey = val);
                            final selectedChat = chats.firstWhere((chat) {
                              final value = chat.channelId ?? chat.recipientId;
                              final type = chat.chatType ?? '';
                              return '$type-$value' == val;
                            });

                            if (selectedChat.chatType == 'channel') {
                              _filesFuture = fetchFilesData(
                                channelId: selectedChat.channelId.toString(),
                              );
                            } else {
                              _filesFuture = fetchFilesData(
                                recipientId: selectedChat.recipientId
                                    .toString(),
                              );
                            }
                            setState(() {});
                          },
                          buttonStyleData: ButtonStyleData(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            height: 50,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: appColor(context).fieldCardBg,
                              ),
                              color: appColor(context).fieldCardBg,
                            ),
                          ),
                          dropdownStyleData: DropdownStyleData(
                            maxHeight: 300,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              color: appColor(context).fieldCardBg,
                            ),
                          ),
                          dropdownSearchData: DropdownSearchData(
                            searchController: searchController,
                            searchInnerWidgetHeight: 50,
                            searchInnerWidget: Container(
                              height: 50,
                              padding: const EdgeInsets.only(
                                top: 8,
                                bottom: 4,
                                right: 8,
                                left: 8,
                              ),
                              child: TextFormField(
                                expands: true,
                                maxLines: null,
                                controller: searchController,
                                decoration: InputDecoration(
                                  isDense: true,
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: Sizes.s10,
                                    vertical: Sizes.s10,
                                  ),
                                  prefixIcon: SvgPicture.asset(
                                    svgAssets.search,
                                  ),
                                  hintText: 'Search conversations...',
                                  hintStyle: const TextStyle(fontSize: 12),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ),
                            searchMatchFn: (item, searchValue) {
                              final chat = chats.firstWhere((c) {
                                final value = c.channelId ?? c.recipientId;
                                final type = c.chatType ?? '';
                                return '$type-$value' == item.value;
                              });
                              return chat.name?.toLowerCase().contains(
                                    searchValue.toLowerCase(),
                                  ) ??
                                  false;
                            },
                          ),
                          onMenuStateChange: (isOpen) {
                            if (!isOpen) {
                              searchController.clear();
                            }
                          },
                        ),
                      ),
              ),
              /*      // 🔹 Dropdown
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 20,
                ),
                child: isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : DropdownButtonFormField<String>(isDense: true,
                  isExpanded: true,
                        value: selectedChatKey,
                        hint: const Text("Select Conversation"),
                        items: chats.map((chat) {
                          final value = chat.channelId ?? chat.recipientId;
                          final type = chat.chatType ?? '';
                          return DropdownMenuItem<String>(
                            value: '$type-$value',
                            child: Text(chat.name ?? 'Unknown Chat'),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() => selectedChatKey = val);
                          final selectedChat = chats.firstWhere((chat) {
                            final value = chat.channelId ?? chat.recipientId;
                            final type = chat.chatType ?? '';
                            return '$type-$value' == val;
                          });

                          if (selectedChat.chatType == 'channel') {
                            _filesFuture = fetchFilesData(
                              channelId: selectedChat.channelId.toString(),
                            );
                          } else {
                            _filesFuture = fetchFilesData(
                              recipientId: selectedChat.recipientId.toString(),
                            );
                          }
                          setState(() {});
                        },
                        decoration: InputDecoration(
                          filled: true,
                          fillColor:
                              Theme.of(context).brightness == Brightness.dark
                              ? Colors.white.withOpacity(0.1)
                              : */
              /* appColor(
                                                            context,
                                                          ).textFieldFillColor, */
              /* Colors
                                    .white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                        ),
                      ),
              ),*/

              // 🔹 Files Section
              Expanded(
                child: _filesFuture == null
                    ? Center(
                        child: Text(
                          "Please select a chat to view files.",
                          style: TextStyle(color: appColor(context).darkText),
                        ),
                      )
                    : FutureBuilder<FilesData>(
                        future: _filesFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState ==
                              ConnectionState.waiting) {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                          if (snapshot.hasError) {
                            return Center(
                              child: Text("Error: ${snapshot.error}"),
                            );
                          }

                          final files = snapshot.data?.files ?? [];
                          final images = files
                              .where((f) => f.type == "image")
                              .toList();
                          final videos = files
                              .where((f) => f.type == "video")
                              .toList();
                          final docs = files
                              .where((f) => f.type == "file")
                              .toList();

                          // if (files.isEmpty) {
                          //   return const Center(
                          //     child: Text(
                          //       "No files found",
                          //       style: TextStyle(
                          //         color: Colors.grey,
                          //         fontSize: 16,
                          //       ),
                          //     ),
                          //   );
                          // }

                          return Column(
                            children: [
                              // 🔹 Top buttons
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceEvenly,
                                children: [
                                  _buildFilterButton(
                                    "Images",
                                    images.length,
                                    "image",
                                  ),
                                  _buildFilterButton(
                                    "Videos",
                                    videos.length,
                                    "video",
                                  ),
                                  _buildFilterButton(
                                    "Files",
                                    docs.length,
                                    "file",
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              // 🔹 Show filtered list
                              // 🔹 Show filtered list
                              Expanded(
                                child: Builder(
                                  builder: (_) {
                                    List<FileItem> selectedList = [];
                                    if (selectedType == "image")
                                      selectedList = images;
                                    if (selectedType == "video")
                                      selectedList = videos;
                                    if (selectedType == "file")
                                      selectedList = docs;

                                    // ✅ Show "No data found" if list is empty
                                    if (selectedList.isEmpty) {
                                      return const Center(
                                        child: Text(
                                          "No data found",
                                          style: TextStyle(
                                            color: Colors.grey,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      );
                                    }

                                    return ListView(
                                      padding: const EdgeInsets.all(10),
                                      children: [
                                        _buildSection(
                                          selectedType == "image"
                                              ? "Images"
                                              : selectedType == "video"
                                              ? "Videos"
                                              : "Files",
                                          selectedList,
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              ),
                            ],
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 🔹 Toggle Button Widget
  Widget _buildFilterButton(String title, int count, String type) {
    final isSelected = selectedType == type;
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedType = isSelected ? "image" : type; // toggle off/on
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? appColor(context).primary
              : isDark(context)
              ? Colors.black
              : Colors.white,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: appColor(context).primary),
        ),
        child: Row(
          children: [
            Text(
              "$title ($count)",
              style: TextStyle(
                color: isSelected ? Colors.white : appColor(context).primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 🔹 File List Section
  Widget _buildSection(String title, List<FileItem> files) {
    if (files.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: files.map((file) {
        return Container(
          height: Sizes.s190,
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 10, left: 10, right: 10),
          decoration: BoxDecoration(
            color: appColor(context).white,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (file.type == "image")
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    "${AppConstants.appUrl}${file.fileUrl}",
                    width: double.infinity,
                    height: Sizes.s120,
                    fit: BoxFit.cover,
                  ),
                )
              else if (file.type == "video")
                FutureBuilder<Uint8List?>(
                  future: VideoThumbnail.thumbnailData(
                    video: file.fileUrl.startsWith('http')
                        ? file.fileUrl
                        : '${AppConstants.appUrl}${file.fileUrl}',
                    imageFormat: ImageFormat.PNG,
                    maxWidth: 250,
                    quality: 75,
                  ),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return Container(
                        width: double.infinity,
                        height: 111,
                        color: Colors.black12,
                        child: const Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (snapshot.hasError || snapshot.data == null) {
                      return Container(
                        width: double.infinity,
                        height: 111,
                        color: Colors.black12,
                        child: const Center(child: Icon(Icons.error)),
                      );
                    }
                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => VideoPlayerScreen(
                              videoUrl: file.fileUrl.startsWith('http')
                                  ? file.fileUrl
                                  : '${AppConstants.appUrl}${file.fileUrl}',
                            ),
                          ),
                        );
                      },
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.memory(
                              snapshot.data!,
                              width: double.infinity,
                              height: 111,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Icon(
                            Icons.play_circle_fill,
                            size: 48,
                            color: Colors.white.withOpacity(0.8),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              VSpace(Sizes.s12),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: Sizes.s8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          file.fileName,
                          overflow: TextOverflow.ellipsis,
                          style: appCss.dmSansMedium14.textColor(
                            appColor(context).black,
                          ),
                        ).width(Sizes.s250),
                        VSpace(Sizes.s10),
                        Text(
                          DateFormat("MM/dd/yy, hh:mm a").format(
                            (file.createdAt ?? DateTime.now()).toLocal(),
                          ),
                          style: appCss.dmSansMedium12.textColor(
                            appColor(context).darkText,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () {
                        var fileUrl = '${AppConstants.appUrl}${file.fileUrl}';
                        log('file.fileUrl::${fileUrl}');
                        ChatsLayout().downloadDocument(
                          context,
                          fileUrl,
                          file.fileName,
                        );
                      },
                      icon: Icon(
                        Icons.file_download_outlined,
                        color: appColor(context).darkText,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
