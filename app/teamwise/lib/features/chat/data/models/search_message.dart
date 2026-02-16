// search_model.dart
class SearchResult {
  final List<SearchMessage> messages;
  final Pagination pagination;
  final SearchInfo searchInfo;

  SearchResult({
    required this.messages,
    required this.pagination,
    required this.searchInfo,
  });

  factory SearchResult.fromJson(Map<String, dynamic> json) {
    return SearchResult(
      messages: (json['messages'] as List)
          .map((message) => SearchMessage.fromJson(message))
          .toList(),
      pagination: Pagination.fromJson(json['pagination']),
      searchInfo: SearchInfo.fromJson(json['searchInfo']),
    );
  }
}

class SearchMessage {
  final int id;
  final int senderId;
  final int? channelId;
  final int teamId;
  final int? recipientId;
  final int? parentId;
  final String content;
  final String messageType;
  final String? fileUrl;
  final String? fileType;
  final dynamic metadata;
  final List<dynamic> mentions;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;
  final dynamic sender;
  final dynamic recipient;
  final Channel? channel;
  final List<Status> statuses;
  final List<dynamic> reaction;
  final List<dynamic> favorites;
  final dynamic parent;
  final List<dynamic> reactions;
  final bool isFavorite;
  final SearchContext searchContext;

  SearchMessage({
    required this.id,
    required this.senderId,
    this.channelId,
    required this.teamId,
    this.recipientId,
    this.parentId,
    required this.content,
    required this.messageType,
    this.fileUrl,
    this.fileType,
    this.metadata,
    required this.mentions,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    this.sender,
    this.recipient,
    this.channel,
    required this.statuses,
    required this.reaction,
    required this.favorites,
    this.parent,
    required this.reactions,
    required this.isFavorite,
    required this.searchContext,
  });
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sender_id': senderId,
      'channel_id': channelId,
      'team_id': teamId,
      'recipient_id': recipientId,
      'parent_id': parentId,
      'content': content,
      'message_type': messageType,
      'file_url': fileUrl,
      'file_type': fileType,
      'metadata': metadata,
      'mentions': mentions,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
      'sender': sender,
      'recipient': recipient,
      'channel': channel?.toJson(),
      'statuses': statuses.map((s) => s.toJson()).toList(),
      'reaction': reaction,
      'favorites': favorites,
      'parent': parent,
      'reactions': reactions,
      'isFavorite': isFavorite,
      'searchContext': searchContext.toJson(),
    };
  }

  factory SearchMessage.fromJson(Map<String, dynamic> json) {
    return SearchMessage(
      id: json['id'],
      senderId: json['sender_id'],
      channelId: json['channel_id'],
      teamId: json['team_id'],
      recipientId: json['recipient_id'],
      parentId: json['parent_id'],
      content: json['content'],
      messageType: json['message_type'],
      fileUrl: json['file_url'],
      fileType: json['file_type'],
      metadata: json['metadata'],
      mentions: json['mentions'] ?? [],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      deletedAt: json['deleted_at'] != null ? DateTime.parse(json['deleted_at']) : null,
      sender: json['sender'] is Map ? json['sender'] as Map<String, dynamic> : null,
      recipient: json['recipient'],
      channel: json['channel'] != null ? Channel.fromJson(json['channel']) : null,
      statuses: (json['statuses'] as List).map((status) => Status.fromJson(status)).toList(),
      reaction: json['reaction'] ?? [],
      favorites: json['favorites'] ?? [],
      parent: json['parent'],
      reactions: json['reactions'] ?? [],
      isFavorite: json['isFavorite'] ?? false,
      searchContext: SearchContext.fromJson(json['searchContext']),
    );
  }
}

class Channel {
  final int id;
  final String name;
  final String type;
  final String description;

  Channel({
    required this.id,
    required this.name,
    required this.type,
    required this.description,
  });
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'description': description,
    };
  }
  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      description: json['description'],
    );
  }
}

class Status {
  final int userId;
  final String status;
  final DateTime updatedAt;

  Status({
    required this.userId,
    required this.status,
    required this.updatedAt,
  });
  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'status': status,
      'updated_at': updatedAt.toIso8601String(),
    };
  }
  factory Status.fromJson(Map<String, dynamic> json) {
    return Status(
      userId: json['user_id'],
      status: json['status'],
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}

class SearchContext {
  final List<String> matchType;
  final String snippet;
  final double relevanceScore;

  SearchContext({
    required this.matchType,
    required this.snippet,
    required this.relevanceScore,
  });
  Map<String, dynamic> toJson() {
    return {
      'matchType': matchType,
      'snippet': snippet,
      'relevanceScore': relevanceScore,
    };
  }
  factory SearchContext.fromJson(Map<String, dynamic> json) {
    return SearchContext(
      matchType: List<String>.from(json['matchType']),
      snippet: json['snippet'],
      relevanceScore: json['relevanceScore'].toDouble(),
    );
  }
}

class Pagination {
  final int total;
  final int limit;
  final int offset;
  final bool hasMore;
  final int? nextOffset;
  final int currentPage;
  final int totalPages;

  Pagination({
    required this.total,
    required this.limit,
    required this.offset,
    required this.hasMore,
    this.nextOffset,
    required this.currentPage,
    required this.totalPages,
  });

  factory Pagination.fromJson(Map<String, dynamic> json) {
    return Pagination(
      total: json['total'],
      limit: json['limit'],
      offset: json['offset'],
      hasMore: json['hasMore'],
      nextOffset: json['nextOffset'],
      currentPage: json['currentPage'],
      totalPages: json['totalPages'],
    );
  }
}

class SearchInfo {
  final String query;
  final String searchType;
  final String scope;
  final int resultsFound;
  final int searchTime;
  final Map<String, dynamic> filters;

  SearchInfo({
    required this.query,
    required this.searchType,
    required this.scope,
    required this.resultsFound,
    required this.searchTime,
    required this.filters,
  });

  factory SearchInfo.fromJson(Map<String, dynamic> json) {
    return SearchInfo(
      query: json['query'],
      searchType: json['searchType'],
      scope: json['scope'],
      resultsFound: json['resultsFound'],
      searchTime: json['searchTime'],
      filters: Map<String, dynamic>.from(json['filters']),
    );
  }
}