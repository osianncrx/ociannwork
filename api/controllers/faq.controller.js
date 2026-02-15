const { Op } = require("sequelize");
const { FAQ } = require("../models");

exports.getAllFaqs = async (req, res) => {
  try {
    const { category, search, status = 'active', page = 1, limit = 10 } = req.query;
    const whereClause = { };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { question: { [Op.like]: `%${search}%` } },
        { answer: { [Op.like]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await FAQ.count({ where: whereClause });
    
    // Get paginated FAQs
    const faqs = await FAQ.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      message: "FAQs retrieved successfully",
      data: {
        faqs: faqs,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error("Error in getAllFaqs:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.createFaq = async (req, res) => {
  try {
    const { question, answer, category = 'General', status = 'active' } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        message: "Question and answer are required"
      });
    }

    const existingFaq = await FAQ.findOne({
      where: {
        question: { [Op.like]: question.trim() }
      }
    });

    if (existingFaq) {
      return res.status(409).json({
        message: "FAQ with this question already exists"
      });
    }

    const newFaq = await FAQ.create({
      question: question.trim(),
      answer: answer.trim(),
      category,
      status
    });

    return res.status(201).json({
      message: "FAQ created successfully",
      data: newFaq
    });

  } catch (err) {
    console.error("Error in createFaq:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, status } = req.body;

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    if (!question || !answer) {
      return res.status(400).json({
        message: "Question and answer are required"
      });
    }

    const existingFaq = await FAQ.findOne({
      where: {
        question: { [Op.like]: question.trim() },
        id: { [Op.ne]: id }
      }
    });

    if (existingFaq) {
      return res.status(409).json({
        message: "FAQ with this question already exists"
      });
    }

    await faq.update({
      question: question.trim(),
      answer: answer.trim(),
      category: category || faq.category,
      status: status || faq.status
    });

    return res.status(200).json({
      message: "FAQ updated successfully",
      data: faq
    });

  } catch (err) {
    console.error("Error in updateFaq:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No FAQ IDs provided or invalid format" });
    }

    const faqs = await FAQ.findAll({
      where: {
        id: ids,
      },
    });

    if (faqs.length === 0) {
      return res
        .status(404)
        .json({ message: "No FAQs found for the provided IDs" });
    }

    await FAQ.destroy({
      where: {
        id: ids,
      },
    });

    return res.status(200).json({
      message: `Successfully deleted ${faqs.length} FAQ(s)`,
    });
  } catch (err) {
    console.error("Error in deleteFaq:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateFaqStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const faq = await FAQ.findByPk(id);
    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    await faq.update({ status });
    
    return res.status(200).json({
      message: "FAQ status updated successfully",
      data: faq
    });
  } catch (err) {
    console.error("Error in updateFaqStatus:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};