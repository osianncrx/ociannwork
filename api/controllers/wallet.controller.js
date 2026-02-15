const { Op } = require("sequelize");
const { Wallet, WalletTransaction, Team } = require("../models");

exports.getWallet = async (req, res) => {
    try {
   
        let wallet = await Wallet.findOne({
            where: { team_id: req.team_id },
            include: [{
                model: Team,
                as: 'team',
                attributes: ['id', 'name']
            }]
        });

        // Create wallet if doesn't exist
        if (!wallet) {
            wallet = await Wallet.create({
                team_id: req.team_id,
                balance: 0.00,
                status: 'active'
            });
        }

        return res.status(200).json({
            message: "Wallet retrieved successfully",
            data: wallet
        });

    } catch (err) {
        console.error("Error in getWallet:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.getWalletBalance = async (req, res) => {
    try {

        const wallet = await Wallet.findOne({
            where: { team_id: req.team_id },
            attributes: ['balance', 'currency', 'status']
        });

        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        return res.status(200).json({
            message: "Balance retrieved successfully",
            data: {
                balance: parseFloat(wallet.balance),
                currency: wallet.currency,
                status: wallet.status
            }
        });

    } catch (err) {
        console.error("Error in getWalletBalance:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.getWalletTransactions = async (req, res) => {
    try {
        const {
          page = 1,
          limit = 20,
          transaction_type,
          reference_type,
          start_date,
          end_date
        } = req.query;

        const wallet = await Wallet.findOne({
            where: { team_id: req.team_id }
        });

        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        const whereClause = { wallet_id: wallet.id };

        if (transaction_type) {
            whereClause.transaction_type = transaction_type;
        }

        if (reference_type) {
            whereClause.reference_type = reference_type;
        }

        if (start_date || end_date) {
            whereClause.created_at = {};
            if (start_date) {
                whereClause.created_at[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                whereClause.created_at[Op.lte] = new Date(end_date);
            }
        }

        const offset = (page - 1) * limit;
        const total = await WalletTransaction.count({ where: whereClause });

        const transactions = await WalletTransaction.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ['metadata']
            }
        });

        return res.status(200).json({
            message: "Transactions retrieved successfully",
            transactions,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });

    } catch (err) {
        console.error("Error in getWalletTransactions:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
