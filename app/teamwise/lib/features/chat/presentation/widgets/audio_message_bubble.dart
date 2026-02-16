import 'dart:developer';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'package:teamwise/config.dart';

class AudioMessageBubble extends StatefulWidget {
  final String audioUrl;
  final bool isMe;
  final Color bubbleColor;
  final VoidCallback? onMoreTap;
  final String? fileName;

  const AudioMessageBubble({
    super.key,
    required this.audioUrl,
    required this.isMe,
    required this.bubbleColor,
    this.onMoreTap,
    this.fileName,
  });

  @override
  State<AudioMessageBubble> createState() => _AudioMessageBubbleState();
}

class _AudioMessageBubbleState extends State<AudioMessageBubble> {
  late AudioPlayer _player;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  bool _isPlaying = false;
  double _volume = 1.0;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    _initAudioListeners();
    _loadAudioDuration();
  }

  void _initAudioListeners() {
    _player.onDurationChanged.listen((d) {
      if (mounted) setState(() => _duration = d);
    });

    _player.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });

    _player.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _isPlaying = false;
          _position = Duration.zero;
        });
      }
    });

    _player.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() => _isPlaying = state == PlayerState.playing);
      }
    });
  }

  Future<void> _loadAudioDuration() async {
    try {
      await _player.setSourceUrl(widget.audioUrl);
    } catch (e) {
      log('Error loading audio duration: $e');
    }
  }

  Future<void> _togglePlayPause() async {
    try {
      if (_isPlaying) {
        await _player.pause();
      } else {
        await _player.play(UrlSource(widget.audioUrl));
      }
    } catch (e) {
      log('Error toggling play/pause: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to play audio'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _seekTo(Duration position) async {
    try {
      await _player.seek(position);
    } catch (e) {
      log('Error seeking: $e');
    }
  }

  Future<void> _changeVolume(double volume) async {
    try {
      await _player.setVolume(volume);
      setState(() => _volume = volume);
    } catch (e) {
      log('Error changing volume: $e');
    }
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);
    if (hours > 0) return '${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}';
    return '${twoDigits(minutes)}:${twoDigits(seconds)}';
  }

  Future<void> _downloadAudio() async {
    if (_isDownloading) return;

    try {
      setState(() {
        _isDownloading = true;
        _downloadProgress = 0.0;
      });

      // Generate filename
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = widget.fileName ?? 'audio_$timestamp.mp3';

      // Use app's documents directory (no extra permission needed)
      Directory directory = await getApplicationDocumentsDirectory();
      final filePath = '${directory.path}/$fileName';
      log('Downloading audio to: $filePath');

      final request = http.Request('GET', Uri.parse(widget.audioUrl));
      final response = await request.send();

      if (response.statusCode != 200) throw Exception('Failed to download: ${response.statusCode}');

      final file = File(filePath);
      final sink = file.openWrite();
      final totalBytes = response.contentLength ?? 0;
      int receivedBytes = 0;

      await for (var chunk in response.stream) {
        sink.add(chunk);
        receivedBytes += chunk.length;

        if (totalBytes > 0 && mounted) {
          setState(() => _downloadProgress = receivedBytes / totalBytes);
        }
      }

      await sink.close();

      setState(() {
        _isDownloading = false;
        _downloadProgress = 0.0;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Audio downloaded successfully'),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'Open',
              textColor: Colors.white,
              onPressed: () async => await OpenFilex.open(filePath),
            ),
            duration: Duration(seconds: 4),
          ),
        );
      }

      log('Audio downloaded successfully to: $filePath');
    } catch (e) {
      log('Error downloading audio: $e');
      setState(() {
        _isDownloading = false;
        _downloadProgress = 0.0;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download audio'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showDownloadDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Download Audio'),
        content: Text('Do you want to download this audio file?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _downloadAudio();
            },
            child: Text('Download'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(

      constraints: BoxConstraints(minWidth: 200, maxWidth: 250),
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),

      decoration: BoxDecoration(color: widget.bubbleColor, borderRadius: BorderRadius.circular(12)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _togglePlayPause,
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: widget.isMe
                          ? Colors.white.withOpacity(0.3)
                          : Colors.black.withOpacity(0.1),
                    ),
                    child: Icon(
                      _isPlaying ? Icons.pause : Icons.play_arrow,
                      color: widget.isMe ? Colors.white : Colors.black87,
                      size: 24,
                    ),
                  ),
                ),
              ).paddingDirectional(top: Sizes.s10),
              // SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _formatDuration(_position),
                          style: TextStyle(
                            fontSize: 11,
                            color: widget.isMe ? Colors.white.withOpacity(0.8) : Colors.black54,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          _formatDuration(_duration),
                          style: TextStyle(
                            fontSize: 11,
                            color: widget.isMe ? Colors.white.withOpacity(0.6) : Colors.black45,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 4),
                    if (_isDownloading)
                      Column(
                        children: [
                          LinearProgressIndicator(
                            value: _downloadProgress,
                            backgroundColor:
                            widget.isMe ? Colors.white.withOpacity(0.2) : Colors.black.withOpacity(0.1),
                            valueColor: AlwaysStoppedAnimation<Color>(widget.isMe ? Colors.white : Colors.blue),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Downloading ${(_downloadProgress * 100).toInt()}%',
                            style: TextStyle(
                              fontSize: 10,
                              color: widget.isMe ? Colors.white.withOpacity(0.7) : Colors.black54,
                            ),
                          ),
                        ],
                      )
                    else
                      Slider(inactiveColor: widget.isMe ? Colors.white.withOpacity(0.2) : Colors.black.withOpacity(0.1),
                        min: 0,
                        max: _duration.inSeconds > 0 ? _duration.inSeconds.toDouble() : 1,
                        value: _position.inSeconds
                            .toDouble()
                            .clamp(0, _duration.inSeconds.toDouble()),
                        activeColor: Colors.white,
                        onChanged: (value) => _seekTo(Duration(seconds: value.toInt())),
                      ),
                  ],
                ),
              ),
            ],
          ),
          /*   Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Icon(
                      _volume > 0.5 ? Icons.volume_up : _volume > 0 ? Icons.volume_down : Icons.volume_off,
                      size: 18,
                      color: widget.isMe ? Colors.white.withOpacity(0.7) : Colors.black54,
                    ),
                    Expanded(
                      child: Slider(
                        min: 0,
                        max: 1,
                        activeColor: Colors.white
                        ,
                        value: _volume,
                        onChanged: _changeVolume,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  _isDownloading ? Icons.downloading : Icons.download,
                  size: 18,
                  color: widget.isMe ? Colors.white.withOpacity(0.7) : Colors.black54,
                ),
                onPressed: _isDownloading ? null : _showDownloadDialog,
              ),
              // if (widget.onMoreTap != null)
              //   IconButton(
              //     icon: Icon(
              //       Icons.more_vert,
              //       size: 18,
              //       color: widget.isMe ? Colors.white.withOpacity(0.7) : Colors.black54,
              //     ),
              //     onPressed: widget.onMoreTap,
              //   ),
            ],
          ),*/
        ],
      ),
    );
  }
}
