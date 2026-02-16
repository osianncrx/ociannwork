class GlobalSearchData {
  List<Messages>? messages;
  Pagination? pagination;
  SearchInfo? searchInfo;

  GlobalSearchData({this.messages, this.pagination, this.searchInfo});

  GlobalSearchData.fromJson(Map<String, dynamic> json) {
    if (json['messages'] != null) {
      messages = [];
      json['messages'].forEach((v) {
        messages!.add(Messages.fromJson(v));
      });
    }
    pagination = json['pagination'] != null
        ? Pagination.fromJson(json['pagination'])
        : null;
    searchInfo = json['searchInfo'] != null
        ? SearchInfo.fromJson(json['searchInfo'])
        : null;
  }

  Map<String, dynamic> toJson() {
    final data = <String, dynamic>{};
    if (messages != null) {
      data['messages'] = messages!.map((v) => v.toJson()).toList();
    }
    if (pagination != null) data['pagination'] = pagination!.toJson();
    if (searchInfo != null) data['searchInfo'] = searchInfo!.toJson();
    return data;
  }
}

// ------------------------------------------------------------
// MESSAGE MODEL
// ------------------------------------------------------------
class Messages {
  int? id;
  int? senderId;
  int? channelId;
  int? teamId;
  int? recipientId;
  int? parentId;

  String? content;
  String? messageType;
  String? fileUrl;
  String? fileType;
  dynamic metadata;

  List<dynamic>? mentions;

  bool? hasUnreadMentions;
  String? createdAt;
  String? updatedAt;
  String? deletedAt;

  Sender? sender;
  Sender? recipient;
  Channel? channel;
  SearchContext? searchContext;

  Messages({
    this.id,
    this.senderId,
    this.channelId,
    this.teamId,
    this.recipientId,
    this.parentId,
    this.content,
    this.messageType,
    this.fileUrl,
    this.fileType,
    this.metadata,
    this.mentions,
    this.hasUnreadMentions,
    this.createdAt,
    this.updatedAt,
    this.deletedAt,
    this.sender,
    this.recipient,
    this.channel,
    this.searchContext,
  });

  Messages.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    senderId = json['sender_id'];
    channelId = json['channel_id'];
    teamId = json['team_id'];
    recipientId = json['recipient_id'];
    parentId = json['parent_id'];

    content = json['content'];
    messageType = json['message_type'];
    fileUrl = json['file_url']?.toString();
    fileType = json['file_type']?.toString();

    metadata = json['metadata'];

    // Safe list parse
    mentions = json['mentions'] != null
        ? List<dynamic>.from(json['mentions'])
        : [];

    hasUnreadMentions = json['has_unread_mentions'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
    deletedAt = json['deleted_at'];

    sender = json['sender'] != null ? Sender.fromJson(json['sender']) : null;
    recipient =
    json['recipient'] != null ? Sender.fromJson(json['recipient']) : null;
    channel = json['channel'] != null ? Channel.fromJson(json['channel']) : null;

    searchContext = json['searchContext'] != null
        ? SearchContext.fromJson(json['searchContext'])
        : null;
  }

  Map<String, dynamic> toJson() {
    final data = <String, dynamic>{};

    data['id'] = id;
    data['sender_id'] = senderId;
    data['channel_id'] = channelId;
    data['team_id'] = teamId;
    data['recipient_id'] = recipientId;
    data['parent_id'] = parentId;

    data['content'] = content;
    data['message_type'] = messageType;
    data['file_url'] = fileUrl;
    data['file_type'] = fileType;

    data['metadata'] = metadata;
    data['mentions'] = mentions ?? [];

    data['has_unread_mentions'] = hasUnreadMentions;
    data['created_at'] = createdAt;
    data['updated_at'] = updatedAt;
    data['deleted_at'] = deletedAt;

    if (sender != null) data['sender'] = sender!.toJson();
    if (recipient != null) data['recipient'] = recipient!.toJson();
    if (channel != null) data['channel'] = channel!.toJson();
    if (searchContext != null) data['searchContext'] = searchContext!.toJson();

    return data;
  }
}

// ------------------------------------------------------------
// SENDER MODEL
// ------------------------------------------------------------
class Sender {
  int? id;
  String? name;
  String? email;
  String? avatar;

  Sender({this.id, this.name, this.email, this.avatar});

  Sender.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    name = json['name'];
    email = json['email'];
    avatar = json['avatar'];
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'avatar': avatar,
    };
  }
}

// ------------------------------------------------------------
// CHANNEL MODEL
// ------------------------------------------------------------
class Channel {
  int? id;
  String? name;
  String? type;
  String? description;

  Channel({this.id, this.name, this.type, this.description});

  Channel.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    name = json['name'];
    type = json['type'];
    description = json['description'];
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'description': description,
    };
  }
}

// ------------------------------------------------------------
// SEARCH CONTEXT
// ------------------------------------------------------------
class SearchContext {
  List<String>? matchType;
  String? snippet;

  SearchContext({this.matchType, this.snippet});

  SearchContext.fromJson(Map<String, dynamic> json) {
    matchType = json['matchType'] != null
        ? List<String>.from(json['matchType'])
        : [];
    snippet = json['snippet'];
  }

  Map<String, dynamic> toJson() {
    return {
      'matchType': matchType,
      'snippet': snippet,
    };
  }
}

// ------------------------------------------------------------
// PAGINATION
// ------------------------------------------------------------
class Pagination {
  int? total;
  int? limit;
  int? offset;
  bool? hasMore;

  Pagination({this.total, this.limit, this.offset, this.hasMore});

  Pagination.fromJson(Map<String, dynamic> json) {
    total = json['total'];
    limit = json['limit'];
    offset = json['offset'];
    hasMore = json['hasMore'];
  }

  Map<String, dynamic> toJson() {
    return {
      'total': total,
      'limit': limit,
      'offset': offset,
      'hasMore': hasMore,
    };
  }
}

// ------------------------------------------------------------
// SEARCH INFO
// ------------------------------------------------------------
class SearchInfo {
  String? query;
  String? searchType;
  String? scope;
  int? resultsFound;

  SearchInfo({this.query, this.searchType, this.scope, this.resultsFound});

  SearchInfo.fromJson(Map<String, dynamic> json) {
    query = json['query'];
    searchType = json['searchType'];
    scope = json['scope'];
    resultsFound = json['resultsFound'];
  }

  Map<String, dynamic> toJson() {
    return {
      'query': query,
      'searchType': searchType,
      'scope': scope,
      'resultsFound': resultsFound,
    };
  }
}
