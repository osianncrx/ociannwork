const { Op, Sequelize } = require("sequelize");
const { TeamSubscription, Plan, Message } = require("../models");


const getActivePlanForTeam = async (teamId) => {
  if (!teamId) return null;

  return TeamSubscription.findOne({
    where: {
      team_id: teamId,
      status: "active",
      expiry_date: { [Op.gt]: new Date() },
    },
    include: [
      {
        model: Plan,
        as: "plan",
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const calculateTeamStorageUsage = async (teamId) => {
  if (!teamId) return 0;

  try {
   
    const messages = await Message.findAll({
      where: {
        team_id: teamId,
        message_type: {
          [Op.in]: ["image", "video", "file", "audio"],
        },
        file_url: {
          [Op.ne]: null,
        },
        deleted_at: null,
      },
      attributes: ["metadata", "id"],
      paranoid: true,
    });

    let totalBytes = 0;

    // Sum up file sizes from metadata
    for (const message of messages) {
      if (message.metadata) {
        try {
          // Get metadata - Sequelize should parse JSON automatically when raw: false
          let metadata = message.get ? message.get('metadata') : message.metadata;
          
          // Handle different metadata formats
          // If metadata is still a string, parse it
          if (typeof metadata === "string") {
            try {
              metadata = JSON.parse(metadata);
            } catch (parseError) {
              // If parsing fails, skip this message
              if (process.env.NODE_ENV === "development") {
                console.warn(`Failed to parse metadata string for message ${message.id}:`, parseError);
              }
              continue;
            }
          }
          
          // Handle case where metadata might be an object but file_size is a string
          if (metadata && typeof metadata === "object") {
            const fileSize = metadata.file_size;
            
            // Convert file_size to number if it's a string
            let fileSizeBytes = 0;
            if (typeof fileSize === "number" && fileSize > 0) {
              fileSizeBytes = fileSize;
            } else if (typeof fileSize === "string") {
              const parsed = parseFloat(fileSize);
              if (!isNaN(parsed) && parsed > 0) {
                fileSizeBytes = parsed;
              }
            }
            
            // Only count file_size if it's a valid number
            // Skip stickers, location messages, and external URLs (file_url in body)
            if (fileSizeBytes > 0) {
              totalBytes += fileSizeBytes;
            } else if (process.env.NODE_ENV === "development") {
              console.log(`Skipping message ${message.id}: file_size is ${fileSize} (type: ${typeof fileSize})`);
            }
          }
        } catch (error) {
          // Skip invalid metadata - log in development for debugging
          if (process.env.NODE_ENV === "development") {
            console.warn(`Invalid metadata for message in team ${teamId}:`, error, "Metadata:", message.metadata);
          }
        }
      }
    }

    // Convert bytes to MB (1 MB = 1024 * 1024 bytes)
    const totalMB = totalBytes / (1024 * 1024);
    return Math.ceil(totalMB * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error(`Error calculating storage for team ${teamId}:`, error);
    // Return 0 on error to allow uploads (fail open rather than fail closed)
    return 0;
  }
};

/**
 * Calculate storage usage breakdown by attachment type
 * @param {number} teamId - Team ID
 * @returns {Promise<{image: number, video: number, file: number, audio: number}>}
 */
const calculateStorageBreakdownByType = async (teamId) => {
  if (!teamId) return { image: 0, video: 0, file: 0, audio: 0 };

  try {
    // Get all messages with files for this team, grouped by message_type
    // Exclude soft-deleted messages so storage decreases when files are deleted
    const messages = await Message.findAll({
      where: {
        team_id: teamId,
        message_type: {
          [Op.in]: ["image", "video", "file", "audio"],
        },
        file_url: {
          [Op.ne]: null,
        },
        deleted_at: null,
      },
      attributes: ["metadata", "message_type", "id"],
      paranoid: true,
    });

    const breakdown = {
      image: 0,
      video: 0,
      file: 0,
      audio: 0,
    };

    // Sum up file sizes by type
    for (const message of messages) {
      if (message.metadata && message.message_type) {
        try {
          let metadata = message.get ? message.get('metadata') : message.metadata;
          
          if (typeof metadata === "string") {
            try {
              metadata = JSON.parse(metadata);
            } catch (parseError) {
              continue;
            }
          }
          
          if (metadata && typeof metadata === "object") {
            const fileSize = metadata.file_size;
            let fileSizeBytes = 0;
            
            if (typeof fileSize === "number" && fileSize > 0) {
              fileSizeBytes = fileSize;
            } else if (typeof fileSize === "string") {
              const parsed = parseFloat(fileSize);
              if (!isNaN(parsed) && parsed > 0) {
                fileSizeBytes = parsed;
              }
            }
            
            if (fileSizeBytes > 0 && breakdown.hasOwnProperty(message.message_type)) {
              breakdown[message.message_type] += fileSizeBytes;
            }
          }
        } catch (error) {
          // Skip invalid metadata
          continue;
        }
      }
    }

    // Convert bytes to MB for each type
    const breakdownMB = {
      image: Math.ceil((breakdown.image / (1024 * 1024)) * 100) / 100,
      video: Math.ceil((breakdown.video / (1024 * 1024)) * 100) / 100,
      file: Math.ceil((breakdown.file / (1024 * 1024)) * 100) / 100,
      audio: Math.ceil((breakdown.audio / (1024 * 1024)) * 100) / 100,
    };

    return breakdownMB;
  } catch (error) {
    console.error(`Error calculating storage breakdown for team ${teamId}:`, error);
    return { image: 0, video: 0, file: 0, audio: 0 };
  }
};

/**
 * Check if team has sufficient storage for new file(s)
 * @param {number} teamId - Team ID
 * @param {number|Array} newFileSizes - Size(s) of new file(s) in bytes
 * @returns {Promise<{allowed: boolean, currentUsageMB: number, maxStorageMB: number|null, newUsageMB: number, message?: string}>}
 */
const checkStorageLimit = async (teamId, newFileSizes) => {
  if (!teamId) {
    return {
      allowed: false,
      currentUsageMB: 0,
      maxStorageMB: null,
      newUsageMB: 0,
      message: "Team ID is required",
    };
  }

  // Validate file sizes
  const fileSizesArray = Array.isArray(newFileSizes) ? newFileSizes : [newFileSizes];
  const validSizes = fileSizesArray.filter(size => size && typeof size === "number" && size > 0);
  
  if (validSizes.length === 0) {
    // No valid file sizes provided - allow (might be sticker, location, or external URL)
    return {
      allowed: true,
      currentUsageMB: 0,
      maxStorageMB: null,
      newUsageMB: 0,
      message: "No file sizes to check",
    };
  }

  // Get active subscription and plan
  const subscription = await getActivePlanForTeam(teamId);
  
  if (!subscription || !subscription.plan) {
    // No active subscription - allow upload (fail open to avoid blocking users)
    // You can change this to false if you want to restrict uploads without subscription
    return {
      allowed: true,
      currentUsageMB: 0,
      maxStorageMB: null,
      newUsageMB: 0,
      message: "No active subscription found - upload allowed",
    };
  }

  const plan = subscription.plan;
  const maxStorageMB = plan.max_storage_mb;

  // If max_storage_mb is null or undefined, storage is unlimited
  if (maxStorageMB === null || maxStorageMB === undefined) {
    return {
      allowed: true,
      currentUsageMB: 0,
      maxStorageMB: null,
      newUsageMB: 0,
      message: "Unlimited storage",
    };
  }

  // Validate maxStorageMB is a positive number
  if (typeof maxStorageMB !== "number" || maxStorageMB <= 0) {
    // Invalid limit - allow upload (fail open)
    console.warn(`Invalid max_storage_mb (${maxStorageMB}) for team ${teamId} - allowing upload`);
    return {
      allowed: true,
      currentUsageMB: 0,
      maxStorageMB: maxStorageMB,
      newUsageMB: 0,
      message: "Invalid storage limit configuration",
    };
  }

  // Calculate current storage usage
  const currentUsageMB = await calculateTeamStorageUsage(teamId);

  // Calculate total size of new files in MB
  const newFilesSizeBytes = validSizes.reduce((sum, size) => sum + size, 0);
  const newFilesSizeMB = newFilesSizeBytes / (1024 * 1024);

  // Calculate new total usage
  const newUsageMB = currentUsageMB + newFilesSizeMB;

  // Check if new usage exceeds limit (with small buffer for rounding errors)
  const bufferMB = 0.01; // 10KB buffer
  if (newUsageMB > maxStorageMB + bufferMB) {
    const availableMB = Math.max(0, maxStorageMB - currentUsageMB);
    return {
      allowed: false,
      currentUsageMB: Math.ceil(currentUsageMB * 100) / 100,
      maxStorageMB,
      newUsageMB: Math.ceil(newUsageMB * 100) / 100,
      message: `Storage limit exceeded. Current usage: ${Math.ceil(currentUsageMB * 100) / 100} MB / ${maxStorageMB} MB. Available: ${Math.ceil(availableMB * 100) / 100} MB.`,
    };
  }

  return {
    allowed: true,
    currentUsageMB: Math.ceil(currentUsageMB * 100) / 100,
    maxStorageMB,
    newUsageMB: Math.ceil(newUsageMB * 100) / 100,
  };
};

module.exports = {
  getActivePlanForTeam,
  calculateTeamStorageUsage,
  calculateStorageBreakdownByType,
  checkStorageLimit,
};

