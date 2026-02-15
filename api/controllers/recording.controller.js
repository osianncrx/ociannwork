const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { CallRecording, User, Team } = require('../models');
const { Op } = require('sequelize');
const aiMeetingService = require('../services/ai-meeting.service');

const RECORDINGS_DIR = path.join(__dirname, '..', 'public', 'recordings');

// Users who can see ALL recordings (by email)
const ADMIN_RECORDING_EMAILS = [
  'admin@ociannwork.com',
  'pablo@ociann.com',
  'josue@ociann.com',
  'keylor@ociann.com',
];

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

exports.uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No recording file uploaded' });
    }

    const {
      call_id,
      call_type,
      chat_type,
      chat_id,
      chat_name,
      duration,
      participants,
    } = req.body;

    const teamId = req.header('X-Team-ID');

    const fileUrl = `/recordings/${req.file.filename}`;

    const recording = await CallRecording.create({
      call_id: call_id || `call_${Date.now()}`,
      team_id: teamId,
      initiator_id: req.user.id,
      file_url: fileUrl,
      file_size: req.file.size,
      duration: parseInt(duration) || 0,
      call_type: call_type || 'audio',
      chat_type: chat_type || 'dm',
      chat_id: chat_id || null,
      chat_name: chat_name || null,
      participants: participants ? JSON.parse(participants) : [],
      status: 'ready',
    });

    const fullRecording = await CallRecording.findByPk(recording.id, {
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['id', 'name', 'avatar', 'profile_color'],
        },
      ],
    });

    // Auto-trigger AI analysis in the background (don't await)
    if (process.env.OPENAI_API_KEY) {
      processRecordingAI(recording.id).catch((err) => {
        console.error('[AI] Background processing failed for recording', recording.id, err.message);
      });
    }

    return res.status(201).json({
      message: 'Recording uploaded successfully',
      recording: fullRecording,
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getRecordings = async (req, res) => {
  try {
    const teamId = req.header('X-Team-ID');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const callType = req.query.call_type;
    const chatType = req.query.chat_type;

    const userEmail = req.user.email.toLowerCase();
    const isRecordingAdmin =
      req.user.role === 'super_admin' ||
      ADMIN_RECORDING_EMAILS.includes(userEmail);

    const where = { team_id: teamId, status: 'ready' };

    if (!isRecordingAdmin) {
      where.initiator_id = req.user.id;
    }

    if (callType) where.call_type = callType;
    if (chatType) where.chat_type = chatType;
    if (search) {
      where.chat_name = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await CallRecording.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['id', 'name', 'avatar', 'profile_color', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      message: 'Recordings retrieved successfully',
      recordings: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.header('X-Team-ID');

    const recording = await CallRecording.findOne({
      where: { id, team_id: teamId },
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['id', 'name', 'avatar', 'profile_color', 'email'],
        },
      ],
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    const userEmail = req.user.email.toLowerCase();
    const isRecordingAdmin =
      req.user.role === 'super_admin' ||
      ADMIN_RECORDING_EMAILS.includes(userEmail);

    if (!isRecordingAdmin && recording.initiator_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json({ recording });
  } catch (error) {
    console.error('Error fetching recording:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.header('X-Team-ID');

    const recording = await CallRecording.findOne({
      where: { id, team_id: teamId },
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    const userEmail = req.user.email.toLowerCase();
    const isRecordingAdmin =
      req.user.role === 'super_admin' ||
      ADMIN_RECORDING_EMAILS.includes(userEmail);

    if (!isRecordingAdmin && recording.initiator_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(__dirname, '..', 'public', recording.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await recording.destroy();

    return res.status(200).json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Background function to process recording with AI
 */
async function processRecordingAI(recordingId) {
  try {
    const recording = await CallRecording.findByPk(recordingId);
    if (!recording) return;

    // Mark as processing
    await recording.update({ ai_status: 'processing' });
    console.log(`[AI] Processing recording ${recordingId}...`);

    const result = await aiMeetingService.processRecording(recording);

    await recording.update({
      transcript: result.transcript,
      ai_summary: result.summary,
      ai_tasks: result.tasks,
      ai_analysis: result.analysis,
      ai_status: 'completed',
      ai_processed_at: new Date(),
    });

    console.log(`[AI] Recording ${recordingId} processed successfully`);
  } catch (error) {
    console.error(`[AI] Failed to process recording ${recordingId}:`, error.message);
    try {
      await CallRecording.update(
        { ai_status: 'failed' },
        { where: { id: recordingId } }
      );
    } catch (_e) { /* ignore */ }
  }
}

/**
 * Manually trigger AI analysis for a recording
 */
exports.analyzeRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.header('X-Team-ID');

    const recording = await CallRecording.findOne({
      where: { id, team_id: teamId },
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ message: 'OpenAI API key not configured' });
    }

    if (recording.ai_status === 'processing') {
      return res.status(409).json({ message: 'Analysis already in progress' });
    }

    // Start processing in background
    processRecordingAI(recording.id).catch((err) => {
      console.error('[AI] Manual analysis failed:', err.message);
    });

    return res.status(200).json({
      message: 'AI analysis started',
      ai_status: 'processing',
    });
  } catch (error) {
    console.error('Error triggering analysis:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.header('X-Team-ID');

    const recording = await CallRecording.findOne({
      where: { id, team_id: teamId },
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    const userEmail = req.user.email.toLowerCase();
    const isRecordingAdmin =
      req.user.role === 'super_admin' ||
      ADMIN_RECORDING_EMAILS.includes(userEmail);

    if (!isRecordingAdmin && recording.initiator_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://ociannwork.com';
    const shareUrl = `${baseUrl}/recordings/${recording.id}`;

    return res.status(200).json({
      message: 'Share link generated',
      shareUrl,
      fileUrl: recording.file_url,
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Generate a public share token for a recording
 */
exports.makePublic = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.header('X-Team-ID');

    const recording = await CallRecording.findOne({
      where: { id, team_id: teamId },
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    const userEmail = req.user.email.toLowerCase();
    const isRecordingAdmin =
      req.user.role === 'super_admin' ||
      ADMIN_RECORDING_EMAILS.includes(userEmail);

    if (!isRecordingAdmin && recording.initiator_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate token if not already public
    let shareToken = recording.share_token;
    if (!shareToken) {
      shareToken = crypto.randomBytes(32).toString('hex');
      await recording.update({ share_token: shareToken, is_public: true });
    } else {
      await recording.update({ is_public: true });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://ociannwork.com';
    const publicUrl = `${baseUrl}/r/${shareToken}`;

    return res.status(200).json({
      message: 'Public link generated',
      publicUrl,
      share_token: shareToken,
    });
  } catch (error) {
    console.error('Error making recording public:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Revoke public access to a recording
 */
exports.revokePublic = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.header('X-Team-ID');

    const recording = await CallRecording.findOne({
      where: { id, team_id: teamId },
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    await recording.update({ is_public: false });

    return res.status(200).json({ message: 'Public access revoked' });
  } catch (error) {
    console.error('Error revoking public access:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get a recording by public share token (NO AUTH REQUIRED)
 */
exports.getPublicRecording = async (req, res) => {
  try {
    const { token } = req.params;

    const recording = await CallRecording.findOne({
      where: { share_token: token, is_public: true, status: 'ready' },
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['id', 'name', 'avatar', 'profile_color'],
        },
      ],
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found or access revoked' });
    }

    return res.status(200).json({ recording });
  } catch (error) {
    console.error('Error fetching public recording:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
