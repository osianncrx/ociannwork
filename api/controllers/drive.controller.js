const path = require('path');
const fs = require('fs');
const { Message, User, Channel, TeamMember, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /drive - Get all files organized by folders (channels & DMs)
 */
exports.getDrive = async (req, res) => {
  try {
    const teamId = req.header('X-Team-ID');
    const userId = req.user.id;
    const { folder, folder_type, search, file_type, view } = req.query;

    // Base where clause: files from this team
    const where = {
      team_id: teamId,
      message_type: { [Op.in]: ['image', 'video', 'file'] },
      file_url: { [Op.ne]: null },
    };

    // If browsing inside a specific folder
    if (folder && folder_type) {
      if (folder_type === 'channel') {
        where.channel_id = folder;
      } else if (folder_type === 'dm') {
        where[Op.or] = [
          { sender_id: userId, recipient_id: folder },
          { sender_id: folder, recipient_id: userId },
        ];
      }
    }

    // Search filter
    if (search) {
      where[Op.and] = sequelize.where(
        sequelize.json('metadata.original_filename'),
        { [Op.like]: `%${search}%` }
      );
    }

    // File type filter
    if (file_type && file_type !== 'all') {
      where.message_type = file_type;
    }

    // If no folder selected, return folder structure
    if (!folder) {
      // Get channels with files
      const channelFiles = await Message.findAll({
        attributes: [
          'channel_id',
          [sequelize.fn('COUNT', sequelize.col('Message.id')), 'file_count'],
          [sequelize.fn('SUM', sequelize.json('metadata.file_size')), 'total_size'],
          [sequelize.fn('MAX', sequelize.col('Message.created_at')), 'last_modified'],
        ],
        where: {
          team_id: teamId,
          message_type: { [Op.in]: ['image', 'video', 'file'] },
          file_url: { [Op.ne]: null },
          channel_id: { [Op.ne]: null },
        },
        include: [{
          model: Channel,
          as: 'channel',
          attributes: ['id', 'name', 'avatar', 'type'],
        }],
        group: ['channel_id'],
        raw: false,
      });

      // Get DMs with files
      const dmFilesSent = await Message.findAll({
        attributes: [
          'recipient_id',
          [sequelize.fn('COUNT', sequelize.col('Message.id')), 'file_count'],
          [sequelize.fn('MAX', sequelize.col('Message.created_at')), 'last_modified'],
        ],
        where: {
          team_id: teamId,
          message_type: { [Op.in]: ['image', 'video', 'file'] },
          file_url: { [Op.ne]: null },
          sender_id: userId,
          recipient_id: { [Op.ne]: null },
          channel_id: null,
        },
        group: ['recipient_id'],
        raw: true,
      });

      const dmFilesReceived = await Message.findAll({
        attributes: [
          'sender_id',
          [sequelize.fn('COUNT', sequelize.col('Message.id')), 'file_count'],
          [sequelize.fn('MAX', sequelize.col('Message.created_at')), 'last_modified'],
        ],
        where: {
          team_id: teamId,
          message_type: { [Op.in]: ['image', 'video', 'file'] },
          file_url: { [Op.ne]: null },
          recipient_id: userId,
          channel_id: null,
        },
        group: ['sender_id'],
        raw: true,
      });

      // Merge DM file counts by user
      const dmMap = new Map();
      for (const row of dmFilesSent) {
        const uid = row.recipient_id;
        if (!dmMap.has(uid)) dmMap.set(uid, { count: 0, last_modified: null });
        const entry = dmMap.get(uid);
        entry.count += parseInt(row.file_count) || 0;
        if (!entry.last_modified || new Date(row.last_modified) > new Date(entry.last_modified)) {
          entry.last_modified = row.last_modified;
        }
      }
      for (const row of dmFilesReceived) {
        const uid = row.sender_id;
        if (!dmMap.has(uid)) dmMap.set(uid, { count: 0, last_modified: null });
        const entry = dmMap.get(uid);
        entry.count += parseInt(row.file_count) || 0;
        if (!entry.last_modified || new Date(row.last_modified) > new Date(entry.last_modified)) {
          entry.last_modified = row.last_modified;
        }
      }

      // Get user details for DM folders
      const dmUserIds = Array.from(dmMap.keys());
      const dmUsers = dmUserIds.length > 0
        ? await User.findAll({
            where: { id: { [Op.in]: dmUserIds } },
            attributes: ['id', 'name', 'avatar', 'profile_color'],
          })
        : [];

      // Build folders
      const folders = [];

      // Channel folders
      for (const cf of channelFiles) {
        const ch = cf.channel || cf.dataValues?.channel;
        if (!ch) continue;
        folders.push({
          id: `channel_${ch.id || cf.dataValues.channel_id}`,
          name: ch.name || ch.dataValues?.name || 'Canal',
          type: 'channel',
          folder_id: String(ch.id || cf.dataValues.channel_id),
          icon: (ch.type || ch.dataValues?.type) === 'private' ? 'lock' : 'hash',
          avatar: ch.avatar || ch.dataValues?.avatar || null,
          file_count: parseInt(cf.dataValues.file_count) || 0,
          total_size: parseInt(cf.dataValues.total_size) || 0,
          last_modified: cf.dataValues.last_modified,
        });
      }

      // DM folders
      for (const user of dmUsers) {
        const entry = dmMap.get(user.id);
        if (!entry) continue;
        folders.push({
          id: `dm_${user.id}`,
          name: user.name,
          type: 'dm',
          folder_id: String(user.id),
          icon: 'user',
          avatar: user.avatar,
          profile_color: user.profile_color,
          file_count: entry.count,
          total_size: 0,
          last_modified: entry.last_modified,
        });
      }

      // Sort by last_modified desc
      folders.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());

      // Get total stats
      const totalFiles = folders.reduce((sum, f) => sum + f.file_count, 0);

      return res.status(200).json({
        view: 'folders',
        folders,
        stats: {
          total_files: totalFiles,
          total_folders: folders.length,
        },
      });
    }

    // Browsing inside a folder - return files
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const order = req.query.sort === 'name' ? [['metadata', 'ASC']] : [['created_at', 'DESC']];

    const { count, rows } = await Message.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'avatar', 'profile_color'],
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const files = rows.map((msg) => {
      const meta = msg.metadata || {};
      return {
        id: msg.id,
        name: meta.original_filename || msg.file_url?.split('/').pop() || 'file',
        type: msg.message_type,
        mime_type: msg.file_type || meta.mime_type || '',
        file_url: msg.file_url,
        size: meta.file_size || 0,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender: msg.sender ? {
          id: msg.sender.id,
          name: msg.sender.name,
          avatar: msg.sender.avatar,
          profile_color: msg.sender.profile_color,
        } : null,
      };
    });

    // Get folder name
    let folderName = '';
    if (folder_type === 'channel') {
      const ch = await Channel.findByPk(folder, { attributes: ['name'] });
      folderName = ch ? ch.name : 'Canal';
    } else if (folder_type === 'dm') {
      const u = await User.findByPk(folder, { attributes: ['name'] });
      folderName = u ? u.name : 'Usuario';
    }

    return res.status(200).json({
      view: 'files',
      folder_name: folderName,
      folder_type,
      folder_id: folder,
      files,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error in getDrive:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /drive/upload - Upload file directly to a channel or DM
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const teamId = req.header('X-Team-ID');
    const { channel_id, recipient_id } = req.body;

    if (!channel_id && !recipient_id) {
      return res.status(400).json({ message: 'channel_id or recipient_id required' });
    }

    const fileUrl = `/uploads/messages/team_${teamId}/${req.file.filename}`;
    const mimeType = req.file.mimetype || '';

    let messageType = 'file';
    if (mimeType.startsWith('image/')) messageType = 'image';
    else if (mimeType.startsWith('video/')) messageType = 'video';

    const message = await Message.create({
      sender_id: req.user.id,
      team_id: teamId,
      channel_id: channel_id || null,
      recipient_id: recipient_id || null,
      content: '',
      message_type: messageType,
      file_url: fileUrl,
      file_type: mimeType,
      metadata: {
        original_filename: req.file.originalname,
        file_size: req.file.size,
        mime_type: mimeType,
      },
    });

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: message.id,
        name: req.file.originalname,
        type: messageType,
        mime_type: mimeType,
        file_url: fileUrl,
        size: req.file.size,
        created_at: message.created_at,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
