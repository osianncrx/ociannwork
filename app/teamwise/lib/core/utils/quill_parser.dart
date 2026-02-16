import 'dart:convert';
import 'dart:developer';

class QuillParser {
  static String deltaToPlainText(dynamic deltaJson) {
    if (deltaJson == null) return '';

    // 🟢 1️⃣ If it's already a Map or List, process it directly
    if (deltaJson is Map || deltaJson is List) {
      return _processParsedDelta(deltaJson);
    }

    String deltaString = deltaJson.toString().trim();
    if (deltaString.isEmpty) return '';

    try {
      // 🟢 2️⃣ If it's already plain text (not JSON), return it
      if (!deltaString.startsWith('{') && !deltaString.startsWith('[')) {
        return deltaString;
      }

      // 🟢 3️⃣ Handle Dart-style string: "{mention: {index: 1, value: Peter Parker}}"
      if (deltaString.contains('mention') && deltaString.contains('value:')) {
        final match = RegExp(r'value:\s*([^,}\]]+)').firstMatch(deltaString);
        if (match != null) {
          return '@${match.group(1)?.trim() ?? ''}';
        }
      }

      // 🟢 4️⃣ Try proper JSON decode
      dynamic decoded;
      try {
        decoded = json.decode(deltaString);
        return _processParsedDelta(decoded);
      } catch (e) {
        // If JSON decode fails, it might be a Dart Map-to-string representation
        // which looks like {ops: [{insert: text}]} (no quotes on keys)
        return _extractTextManually(deltaString);
      }
    } catch (e) {
      log('❌ Error in deltaToPlainText: $e');
      return _extractTextManually(deltaString);
    }
  }

  /// Internal helper to process a decoded JSON or Dart object
  static String _processParsedDelta(dynamic delta) {
    try {
      final StringBuffer textBuffer = StringBuffer();

      // Handle Map with "ops"
      if (delta is Map<String, dynamic> && delta.containsKey('ops')) {
        final List ops = delta['ops'] as List;
        for (var op in ops) {
          _handleOp(op, textBuffer);
        }
      }
      // Handle direct List of ops
      else if (delta is List) {
        for (var op in delta) {
          _handleOp(op, textBuffer);
        }
      }
      // Handle single op Map
      else if (delta is Map<String, dynamic> && delta.containsKey('insert')) {
        _handleOp(delta, textBuffer);
      } else {
        // Fallback for unknown object structure
        return delta.toString().trim();
      }

      return textBuffer.toString().trim();
    } catch (e) {
      log('⚠️ Error processing parsed delta: $e');
      return delta.toString().trim();
    }
  }

  static void _handleOp(dynamic op, StringBuffer textBuffer) {
    if (op is Map<String, dynamic> && op.containsKey('insert')) {
      final insert = op['insert'];

      // Handle mention object
      if (insert is Map<String, dynamic> && insert.containsKey('mention')) {
        textBuffer.write('@${insert['mention']['value']}');
      }
      // Handle regular text
      else if (insert is String) {
        textBuffer.write(insert);
      }
      // Handle other types
      else {
        textBuffer.write(insert.toString());
      }
    }
  }

  /// Manual text extraction as fallback
  static String _extractTextManually(String deltaString) {
    // log('🔧 Attempting manual extraction for: $deltaString');

    // 1. Try to find all "insert" values (common in Quill Delta)
    // Matches: "insert":"text", insert: text, "insert": "text"
    final Iterable<RegExpMatch> matches = RegExp(
      r'''["\']?insert["\']?\s*:\s*["\']?([^"\',}\]]+)["\']?''',
      multiLine: true,
    ).allMatches(deltaString);

    if (matches.isNotEmpty) {
      final StringBuffer sb = StringBuffer();
      for (final match in matches) {
        String piece = match.group(1) ?? '';
        // Clean up escaped characters if any
        piece = piece.replaceAll(r'\n', '\n').replaceAll(r'\t', '\t').trim();
        if (piece.isNotEmpty) {
          sb.write(piece);
          sb.write(' '); // Add space between multiple fragments
        }
      }
      final result = sb.toString().trim();
      if (result.isNotEmpty) return result;
    }

    // 2. Check for mention value specifically
    if (deltaString.contains('mention') && deltaString.contains('value')) {
      final match = RegExp(
        r'''["\']?value["\']?\s*:\s*["\']?([^,"}\]']+)''',
      ).firstMatch(deltaString);
      if (match != null) {
        return '@${match.group(1)?.trim() ?? ''}';
      }
    }

    // 3. Last resort: Clean the string from JSON-like characters
    // Remove { } [ ] " ' ops: insert: etc.
    String cleaned = deltaString
        .replaceAll(RegExp(r'[\{\}\[\]]'), '')
        .replaceAll(RegExp(r'''["\']?ops["\']?\s*:'''), '')
        .replaceAll(RegExp(r'''["\']?insert["\']?\s*:'''), '')
        .replaceAll('"', '')
        .replaceAll("'", '')
        .replaceAll(r'\n', '\n')
        .trim();

    return cleaned.isEmpty ? deltaString.trim() : cleaned;
  }

  static bool isDeltaFormat(String content) {
    try {
      final parsed = json.decode(content);
      return parsed is Map<String, dynamic> && parsed.containsKey('ops');
    } catch (_) {
      return false;
    }
  }
}
