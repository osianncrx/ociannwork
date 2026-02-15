const { Op } = require("sequelize");
const { Page } = require("../models");

exports.getAllPages = async (req, res) => {
  try {
    const { search, status, created_by, page = 1, limit = 10 } = req.query;
    const whereClause = { };

    // Add created_by filter
    if (created_by) {
      whereClause.created_by = created_by;
    }

    // Add search functionality
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { meta_title: { [Op.iLike]: `%${search}%` } },
        { meta_description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await Page.count({ where: whereClause });
    
    // Get paginated pages
    const pages = await Page.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      message: "Pages retrieved successfully",
      data: {
        pages: pages,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error("Error in getAllPages:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await Page.findOne({
      where: { slug, status: 'active' }
    });

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    return res.status(200).json({
      message: "Page retrieved successfully",
      data: page
    });

  } catch (err) {
    console.error("Error in getPageBySlug:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.createPage = async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      meta_title,
      meta_description,
      status,
      created_by,
    } = req.body;

    // Validation
    if (!title || !slug || !created_by) {
      return res.status(400).json({
        message: "Title, slug, and created_by are required",
      });
    }

    // Check if slug already exists
    const existingPage = await Page.findOne({
      where: {
        slug: slug.trim().toLowerCase(),
      },
    });

    if (existingPage) {
      return res.status(409).json({
        message: "Page with this slug already exists",
      });
    }

    // Convert boolean to ENUM string
    // If status is boolean, convert it. Otherwise, use the string value directly
    let statusValue = "active"; // default
    if (typeof status === "boolean") {
      statusValue = status ? "active" : "deactive";
    } else if (typeof status === "string") {
      statusValue = status === "active" ? "active" : "deactive";
    }

    const newPage = await Page.create({
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      content: content ? content.trim() : null,
      meta_title: meta_title ? meta_title.trim() : null,
      meta_description: meta_description ? meta_description.trim() : null,
      status: statusValue,
      created_by,
    });

    return res.status(201).json({
      message: "Page created successfully",
      data: newPage,
    });
  } catch (err) {
    console.error("Error in createPage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      slug, 
      content, 
      meta_title, 
      meta_description, 
      status 
    } = req.body;

    const page = await Page.findByPk(id);

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    if (!title || !slug) {
      return res.status(400).json({
        message: "Title and slug are required"
      });
    }

    const existingPage = await Page.findOne({
      where: {
        slug: slug.trim().toLowerCase(),
        id: { [Op.ne]: id }
      }
    });

    if (existingPage) {
      return res.status(409).json({
        message: "Page with this slug already exists"
      });
    }

    await page.update({
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      content: content ? content.trim() : page.content,
      meta_title: meta_title ? meta_title.trim() : page.meta_title,
      meta_description: meta_description ? meta_description.trim() : page.meta_description,
      status: status !== undefined ? status : page.status
    });

    return res.status(200).json({
      message: "Page updated successfully",
      data: page
    });

  } catch (err) {
    console.error("Error in updatePage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deletePage = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ message: "No page IDs provided or invalid format" });
    }

    const pages = await Page.findAll({
      where: {
        id: ids,
      },
    });

    if (pages.length === 0) {
      return res
        .status(404)
        .json({ message: "No pages found for the provided IDs" });
    }

    await Page.destroy({
      where: {
        id: ids,
      },
    });

    return res.status(200).json({
      message: `Successfully deleted ${pages.length} page(s)`,
    });
  } catch (err) {
    console.error("Error in deletePage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updatePageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const page = await Page.findByPk(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    await page.update({ status });
    
    return res.status(200).json({
      message: "Page status updated successfully",
      data: page
    });
  } catch (err) {
    console.error("Error in updatePageStatus:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};