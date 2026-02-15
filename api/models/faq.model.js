module.exports = (sequelize, DataTypes) => {
  const FAQ = sequelize.define(
    "FAQ",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      question: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'General',
      },
      status: {
        type: DataTypes.ENUM('active', 'deactive'),
        defaultValue: 'active',
        allowNull: false,
      },
    },
    {
      tableName: 'faqs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return FAQ;
};
