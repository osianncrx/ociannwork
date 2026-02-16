import React from 'react';

interface ExportButtonsProps {
  onExcel?: () => void;
  onPDF?: () => void;
  onPrint?: () => void;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ onExcel, onPDF, onPrint }) => {
  const buttons = [
    {
      label: 'Excel',
      icon: '📊',
      onClick: onExcel,
      color: '#22c55e',
    },
    {
      label: 'PDF',
      icon: '📄',
      onClick: onPDF,
      color: '#ef4444',
    },
    {
      label: 'Imprimir',
      icon: '🖨️',
      onClick: onPrint,
      color: '#3b82f6',
    },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      {buttons.map((button, index) => {
        if (!button.onClick) return null;
        
        return (
          <button
            key={index}
            onClick={button.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'rgba(15,23,42,0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: '10px',
              border: `1px solid ${button.color}40`,
              color: button.color,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 20px ${button.color}30`;
              e.currentTarget.style.background = `linear-gradient(135deg, ${button.color}20, ${button.color}10)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = 'rgba(15,23,42,0.8)';
            }}
          >
            <span style={{ fontSize: '18px' }}>{button.icon}</span>
            <span>{button.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ExportButtons;
