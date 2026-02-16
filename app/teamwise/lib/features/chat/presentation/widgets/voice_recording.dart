import 'dart:async';
import 'dart:developer';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../bloc/chat_bloc.dart';

class VoiceRecordingHelper {
  // keep using your AudioRecorder internally if you have one,
  // but for pause/resume/timer logic we use this wrapper.
  final AudioRecorder _audioRecorder = AudioRecorder();

  bool _isRecording = false;
  bool _isPaused = false;
  String? _audioPath;

  // Stopwatch & ticker used to show mm:ss timer (pauses while paused)
  final Stopwatch _stopwatch = Stopwatch();
  Timer? _ticker;

  // Expose a ValueNotifier so UI can listen and update the timer
  final ValueNotifier<String> recordingDuration = ValueNotifier<String>('00:00');
  final ValueNotifier<bool> isPausedNotifier = ValueNotifier<bool>(false);

  bool get isRecording => _isRecording;
  bool get isPaused => _isPaused;
  String? get audioPath => _audioPath;

  void _startTicker() {
    _ticker?.cancel();
    // Update UI every 200ms for smoothness
    _ticker = Timer.periodic(Duration(milliseconds: 200), (_) {
      final elapsed = _stopwatch.elapsed;
      final minutes = elapsed.inMinutes.toString().padLeft(2, '0');
      final seconds = (elapsed.inSeconds % 60).toString().padLeft(2, '0');
      recordingDuration.value = '$minutes:$seconds';
    });
  }

  void _stopTicker() {
    _ticker?.cancel();
    _ticker = null;
  }

  /// Start voice recording
  Future<bool> startRecording() async {
    try {
      // Request microphone permission
      if (await Permission.microphone.isDenied) {
        final status = await Permission.microphone.request();
        if (!status.isGranted) {
          log('❌ Microphone permission denied');
          return false;
        }
      }

      // Defensive check: if already recording via underlying recorder
      try {
        if (await _audioRecorder.isRecording()) {
          log('⚠️ Already recording (underlying recorder)');
          return false;
        }
      } catch (_) {
        // ignore if underlying recorder doesn't support isRecording
      }

      // Generate file path (keep .mp3 as in your original code)
      final directory = await getTemporaryDirectory();
      final fileName = 'voice_${DateTime.now().millisecondsSinceEpoch}.mp3';
      _audioPath = '${directory.path}/$fileName';

      // Start underlying recorder - keep your RecordConfig
      await _audioRecorder.start(
        RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: _audioPath!,
      );

      // Start stopwatch & ticker
      _stopwatch.reset();
      _stopwatch.start();
      _startTicker();

      _isRecording = true;
      _isPaused = false;
      recordingDuration.value = '00:00';
      isPausedNotifier.value = false;

      log('🎤 Recording started: $_audioPath');
      return true;
    } catch (e, s) {
      log('❌ Error starting recording: $e\n$s');
      return false;
    }
  }

  /// Pause recording (returns true if paused)
  Future<bool> pauseRecording() async {
    try {
      if (!_isRecording || _isPaused) {
        log('⚠️ Not recording or already paused');
        return false;
      }

      // Try to call underlying pause() if available
      try {
        await _audioRecorder.pause();
      } catch (e) {
        // Underlying recorder may not support pause; that's okay.
        log('ℹ️ Underlying recorder pause not supported: $e');
      }

      // Stop stopwatch so timer stops accumulating
      _stopwatch.stop();
      isPausedNotifier.value = true;
      _isPaused = true;

      log('⏸️ Recording paused at ${recordingDuration.value}');
      return true;
    } catch (e, s) {
      log('❌ Error pausing recording: $e\n$s');
      return false;
    }
  }

  /// Resume recording
  Future<bool> resumeRecording() async {
    try {
      if (!_isRecording || !_isPaused) {
        log('⚠️ Not paused or not recording');
        return false;
      }

      // Try to call underlying resume() if available
      try {
        await _audioRecorder.resume();
      } catch (e) {
        log('ℹ️ Underlying recorder resume not supported: $e');
      }

      // Restart stopwatch and ticker
      _stopwatch.start();
      isPausedNotifier.value = false;
      _isPaused = false;

      log('▶️ Recording resumed');
      return true;
    } catch (e, s) {
      log('❌ Error resuming recording: $e\n$s');
      return false;
    }
  }

  /// Stop voice recording
  Future<String?> stopRecording() async {
    try {
      if (!_isRecording) {
        log('⚠️ Not recording');
        return null;
      }

      final path = await _audioRecorder.stop();
      _isRecording = false;

      // Stop stopwatch and ticker and finalize duration
      _stopwatch.stop();
      _stopTicker();
      _isPaused = false;
      isPausedNotifier.value = false;

      // Update final duration once more
      final elapsed = _stopwatch.elapsed;
      final minutes = elapsed.inMinutes.toString().padLeft(2, '0');
      final seconds = (elapsed.inSeconds % 60).toString().padLeft(2, '0');
      recordingDuration.value = '$minutes:$seconds';

      // Underlying recorder may return path or not; prefer returned path if valid
      if (path != null && File(path).existsSync()) {
        _audioPath = path;
        log('✅ Recording stopped: $path (duration: ${recordingDuration.value})');
        return path;
      } else if (_audioPath != null && File(_audioPath!).existsSync()) {
        log('✅ Recording stopped (using stored path): $_audioPath (duration: ${recordingDuration.value})');
        return _audioPath;
      } else {
        log('❌ Recording file not found');
        return null;
      }
    } catch (e, s) {
      log('❌ Error stopping recording: $e\n$s');
      _isRecording = false;
      _isPaused = false;
      _stopTicker();
      isPausedNotifier.value = false;
      return null;
    }
  }

  /// Cancel recording without saving
  Future<void> cancelRecording() async {
    try {
      if (_isRecording) {
        try {
          await _audioRecorder.stop();
        } catch (_) {}
        _isRecording = false;
      }

      // Reset stopwatch & UI
      _stopwatch.reset();
      _stopTicker();
      recordingDuration.value = '00:00';
      _isPaused = false;
      isPausedNotifier.value = false;

      // Delete the recorded file if exists
      if (_audioPath != null && File(_audioPath!).existsSync()) {
        try {
          await File(_audioPath!).delete();
          log('🗑️ Recording cancelled and deleted');
        } catch (e) {
          log('⚠️ Failed to delete recording on cancel: $e');
        }
      }

      _audioPath = null;
    } catch (e, s) {
      log('❌ Error cancelling recording: $e\n$s');
    }
  }

  /// Dispose recorder
  void dispose() {
    try {
      _audioRecorder.dispose();
    } catch (_) {}
    _stopTicker();
    recordingDuration.dispose();
    isPausedNotifier.dispose();
  }
}

// Update your ChatsLayout class to add these methods:

class ChatsLayoutVoiceExtension {
  final VoiceRecordingHelper _voiceHelper = VoiceRecordingHelper();

  /// Show recording UI (signature unchanged)
  Widget buildRecordingUI(BuildContext context, VoidCallback onCancel, VoidCallback onSend) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 6,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Row(
        children: [
          // Cancel button
          IconButton(
            icon: Icon(Icons.delete, color: Colors.red, size: 26),
            onPressed: onCancel,
          ),

          SizedBox(width: 8),

          // Recording pulsing dot
          ValueListenableBuilder<bool>(
            valueListenable: _voiceHelper.isPausedNotifier,
            builder: (context, paused, _) {
              final visible = _voiceHelper.isRecording && !paused;
              return Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: visible ? Colors.red : Colors.red.withOpacity(0.4),
                  shape: BoxShape.circle,
                ),
              );
            },
          ),

          SizedBox(width: 12),

          // Timer + Pause/Resume button
          Expanded(
            child: Row(
              children: [
                // Timer
                ValueListenableBuilder<String>(
                  valueListenable: _voiceHelper.recordingDuration,
                  builder: (context, value, _) {
                    return Text(
                      value,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.red.shade700,
                      ),
                    );
                  },
                ),

                SizedBox(width: 12),

                // Pause/Resume button (internal, UI calls helper directly)
                ValueListenableBuilder<bool>(
                  valueListenable: _voiceHelper.isPausedNotifier,
                  builder: (context, paused, _) {
                    return IconButton(
                      icon: Icon(
                        paused ? Icons.play_arrow : Icons.pause,
                        color: Colors.black87,
                      ),
                      onPressed: () async {
                        if (paused) {
                          await _voiceHelper.resumeRecording();
                        } else {
                          await _voiceHelper.pauseRecording();
                        }
                        // Ensure caller's UI rebuilds if they rely on _isRecording bool
                        try {
                          (context as Element).markNeedsBuild();
                        } catch (_) {}
                      },
                    );
                  },
                ),
              ],
            ),
          ),

          // Send button (unchanged)
          IconButton(
            icon: Container(
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.send, color: Colors.white, size: 20),
            ),
            onPressed: onSend,
          ),
        ],
      ),
    );
  }

  /// Handle microphone tap (signature unchanged)
  Future<void> handleMicrophoneTap(
      BuildContext context,
      ChatBloc chatBloc,
      bool isReplying,
      dynamic replyToMessage,
      ScrollController scrollController,
      VoidCallback cancelReply,
      Function(bool) setRecordingState,
      ) async {
    if (_voiceHelper.isRecording) {
      // Stop and send recording (keeps existing behavior)
      final audioPath = await _voiceHelper.stopRecording();
      setRecordingState(false);

      if (audioPath != null) {
        _sendVoiceMessage(
          chatBloc,
          File(audioPath),
          isReplying,
          replyToMessage,
          scrollController,
          cancelReply,
        );
      } else {
        _showErrorSnackbar(context, 'Failed to save recording');
      }
    } else {
      // Start recording
      final started = await _voiceHelper.startRecording();
      if (started) {
        setRecordingState(true);
        // force rebuild where caller uses _isRecording bool
        try {
          (context as Element).markNeedsBuild();
        } catch (_) {}
      } else {
        _showErrorSnackbar(context, 'Failed to start recording');
      }
    }
  }

  /// Cancel recording (signature unchanged)
  Future<void> cancelRecording(Function(bool) setRecordingState) async {
    await _voiceHelper.cancelRecording();
    setRecordingState(false);
    try {
      // ensure calling UI updates
      // no context here; caller's onCancel already calls markNeedsBuild in your code
    } catch (_) {}
  }

  /// Send voice message (unchanged)
  void _sendVoiceMessage(
      ChatBloc chatBloc,
      File audioFile,
      bool isReplying,
      dynamic replyToMessage,
      ScrollController scrollController,
      VoidCallback cancelReply,
      ) {
    String? parentId;
    if (isReplying && replyToMessage != null) {
      final replyId = replyToMessage.id;
      if (replyId != 0) {
        parentId = replyId.toString();
      }
    }

    chatBloc.add(
      SendMessage(
        message: '',
        parentId: parentId,
        mediaFile: audioFile,
        messageType: 'audio',
      ),
    );

    if (isReplying) {
      cancelReply();
    }

    _scrollToBottom(scrollController);
  }

  void _scrollToBottom(ScrollController scrollController) {
    if (scrollController.hasClients) {
      scrollController.animateTo(
        0.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _showErrorSnackbar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void dispose() {
    _voiceHelper.dispose();
  }
}
