import { Card, CardBody, CardHeader } from "reactstrap";
import { DashboardProps } from "../../../types/components/dashboard";

const StorageTracker = ({ data }: DashboardProps) => {
  const storageInfo = data?.data?.storage;
  
  if (!storageInfo) {
    return null;
  }

  const { current_usage_mb, max_storage_mb, usage_percentage, is_unlimited, breakdown } = storageInfo;
  
  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const percentage = usage_percentage ? parseFloat(usage_percentage) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const attachmentTypes = [
    {
      type: 'image',
      label: 'Images',
      icon: 'fa-file-image-o',
      color: 'primary',
      bgColor: 'bg-primary-subtle',
      value: breakdown?.image || 0,
    },
    {
      type: 'video',
      label: 'Videos',
      icon: 'fa-file-video-o',
      color: 'danger',
      bgColor: 'bg-danger-subtle',
      value: breakdown?.video || 0,
    },
    {
      type: 'file',
      label: 'Files',
      icon: 'fa-file-o',
      color: 'info',
      bgColor: 'bg-info-subtle',
      value: breakdown?.file || 0,
    },
    {
      type: 'audio',
      label: 'Audio',
      icon: 'fa-file-audio-o',
      color: 'success',
      bgColor: 'bg-success-subtle',
      value: breakdown?.audio || 0,
    },
  ];


  return (
    <Card className="storage-tracker-card">
      <CardHeader className="card-no-border pb-3">
        <h5 className="mb-0">
          Team Storage Usage
        </h5>
      </CardHeader>
      <CardBody>
        <div className="storage-tracker">
          {is_unlimited ? (
            <div className="unlimited-storage text-center py-4">
              <div className="mb-3">
                <i className="fa fa-infinity fa-3x text-success mb-3" />
              </div>
              <h5 className="text-success mb-2">Unlimited Storage</h5>
              <p className="text-muted mb-0">Your team has unlimited storage for attachments</p>
              <div className="mt-3">
                <span className="badge bg-success-subtle text-success px-3 py-2">
                  Current Usage: {formatStorage(current_usage_mb)}
                </span>
              </div>
            </div>
          ) : (
            <div className="storage-details-container">
              <div className="progress-section">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="text-muted small">
                    {formatStorage(current_usage_mb)} of {formatStorage(max_storage_mb || 0)} used
                  </div>
                  <div className="text-end">
                    <div className="fw-bold fs-5">{percentage.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="position-relative mb-2">
                  <div className="progress storage-progress-bar">
                    {attachmentTypes.map((attachment, index) => {
                      if (attachment.value === 0) return null;
                      
                      const segmentWidth = max_storage_mb && max_storage_mb > 0
                        ? (attachment.value / max_storage_mb) * 100
                        : 0;
                      
                      let leftOffset = 0;
                      for (let i = 0; i < index; i++) {
                        if (attachmentTypes[i].value > 0 && max_storage_mb && max_storage_mb > 0) {
                          leftOffset += (attachmentTypes[i].value / max_storage_mb) * 100;
                        }
                      }
                      
                      const segmentPercentage = current_usage_mb > 0
                        ? (attachment.value / current_usage_mb) * 100
                        : 0;
                      
                      return (
                        <div
                          key={attachment.type}
                          className={`progress-bar bg-${attachment.color} storage-progress-segment`}
                          role="progressbar"
                          style={{
                            width: `${Math.min(segmentWidth, 100)}%`,
                            left: `${leftOffset}%`,
                            borderRight: index < attachmentTypes.length - 1 && attachmentTypes[index + 1].value > 0 
                              ? '1px solid rgba(255,255,255,0.4)' 
                              : 'none',
                          }}
                          title={`${attachment.label}: ${formatStorage(attachment.value)} (${segmentPercentage.toFixed(1)}% of used storage)`}
                        >
                          {segmentWidth >= 8 && (
                            <span className="d-flex align-items-center storage-segment-label">
                              <i className={`fa ${attachment.icon} me-1 storage-segment-icon`} />
                              {formatStorage(attachment.value)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {current_usage_mb === 0 && (
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        <span className="small">No attachments shared yet</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="attachment-breakdown mt-3">
                    <div className="row g-2">
                      {attachmentTypes.map((attachment) => {
                        const segmentPercentage = current_usage_mb > 0
                          ? (attachment.value / current_usage_mb) * 100
                          : 0;
                        
                        const getColorValue = (color: string) => {
                          const colorMap: { [key: string]: string } = {
                            primary: 'rgba(var(--primary-color), 1)',
                            danger: 'rgba(var(--danger-color), 1)',
                            info: 'rgba(var(--secondary-color), 1)',
                            success: 'rgba(var(--success-color), 1)',
                          };
                          return colorMap[color] || 'rgba(var(--gray-medium), 1)';
                        };

                        return (
                          <div key={attachment.type} className="col-md-3 col-sm-6">
                            <div className={`d-flex align-items-center p-2 rounded border ${attachment.value > 0 ? 'bg-white' : 'bg-light'}`}>
                              <div 
                                className="rounded me-2 border storage-color-indicator"
                                style={{
                                  backgroundColor: getColorValue(attachment.color),
                                }}
                              />
                              <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="small d-flex align-items-center fw-semibold">
                                    <i className={`fa ${attachment.icon} me-1 text-${attachment.color}`} />
                                    {attachment.label}
                                  </span>
                                  <span className="fw-bold">
                                    {formatStorage(attachment.value)}
                                  </span>
                                </div>
                                {attachment.value > 0 && current_usage_mb > 0 && (
                                  <small className="text-muted">
                                    {segmentPercentage.toFixed(1)}% of used storage
                                  </small>
                                )}
                                {attachment.value === 0 && (
                                  <small className="text-muted">No {attachment.label.toLowerCase()} shared</small>
                                )}
                              </div>  
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>  
                </div>

                {isAtLimit && (
                  <div className="alert alert-danger mt-3 mb-0 d-flex align-items-center">
                    <i className="fa fa-exclamation-triangle me-2 fs-5" />
                    <div>
                      <strong>Storage limit reached!</strong> Your team has reached the maximum storage capacity. 
                      Please upgrade your plan or contact your administrator.
                    </div>
                  </div>
                )}
                {isNearLimit && !isAtLimit && (
                  <div className="alert alert-warning mt-3 mb-0 d-flex align-items-center">
                    <i className="fa fa-exclamation-circle me-2 fs-5" />
                    <div>
                      <strong>Storage limit approaching!</strong> Your team is using {percentage.toFixed(1)}% of available storage. 
                      Consider upgrading your plan soon.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default StorageTracker;

