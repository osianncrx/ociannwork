class FilesData {
  final List<FileItem> files;
  final bool hasMore;
  final int totalCount;
  final int offset;
  final int? nextOffset;
  final int currentPage;
  final int totalPages;

  FilesData({
    required this.files,
    required this.hasMore,
    required this.totalCount,
    required this.offset,
    this.nextOffset,
    required this.currentPage,
    required this.totalPages,
  });

  factory FilesData.fromJson(Map<String, dynamic> json) {
    return FilesData(
      files: (json['files'] as List<dynamic>?)
          ?.map((e) => FileItem.fromJson(e))
          .toList() ??
          [],
      hasMore: json['hasMore'] ?? false,
      totalCount: json['totalCount'] ?? 0,
      offset: json['offset'] ?? 0,
      nextOffset: json['nextOffset'],
      currentPage: json['currentPage'] ?? 1,
      totalPages: json['totalPages'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'files': files.map((e) => e.toJson()).toList(),
      'hasMore': hasMore,
      'totalCount': totalCount,
      'offset': offset,
      'nextOffset': nextOffset,
      'currentPage': currentPage,
      'totalPages': totalPages,
    };
  }
}

class FileItem {
  final String id;
  final String type;
  final String fileName;
  final String fileUrl;
  final String fileType;
  final String? content;
  final DateTime? createdAt;
  final int senderId;
  final String senderName;
  final int messageId;

  FileItem({
    required this.id,
    required this.type,
    required this.fileName,
    required this.fileUrl,
    required this.fileType,
    this.content,
    this.createdAt,
    required this.senderId,
    required this.senderName,
    required this.messageId,
  });

  factory FileItem.fromJson(Map<String, dynamic> json) {
    return FileItem(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      fileName: json['fileName'] ?? '',
      fileUrl: json['fileUrl'] ?? '',
      fileType: json['fileType'] ?? '',
      content: json['content'],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'])
          : null,
      senderId: json['senderId'] ?? 0,
      senderName: json['senderName'] ?? '',
      messageId: json['messageId'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'fileName': fileName,
      'fileUrl': fileUrl,
      'fileType': fileType,
      'content': content,
      'createdAt': createdAt?.toIso8601String(),
      'senderId': senderId,
      'senderName': senderName,
      'messageId': messageId,
    };
  }
}
