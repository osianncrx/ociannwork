import { FC } from 'react'
import { Keyboard, Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { ImagePath } from '../../constants'
import { GalleryMedia, MediaGalleryProps } from '../../types'
import { Image } from '../image'
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine } from 'react-icons/ri'

const MediaGallery: FC<MediaGalleryProps> = ({ media, initialIndex = 0, onClose, onSlideChange, className = '' }) => {
  return (
    <div
      className={`image-modal-overlay ${className}`}
      onClick={onClose}
    >
      <div className="gallery-container relative" onClick={(e) => e.stopPropagation()}>
        <button className="image-close-button" onClick={onClose}>
          <RiCloseLine />
        </button>

        {media.length > 1 && (
          <div className="gallery-images">
            {`${initialIndex + 1} of ${media.length}`}
          </div>
        )}

        {media.length > 0 ? (
          <Swiper
            modules={[Navigation, Pagination, Keyboard]}
            initialSlide={initialIndex >= 0 ? initialIndex : 0}
            navigation={{
              prevEl: '.custom-swiper-button-prev',
              nextEl: '.custom-swiper-button-next',
            }}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            keyboard={{
              enabled: true,
            }}
            loop={media.length > 1}
            spaceBetween={20}
            onSlideChange={(swiper) => onSlideChange?.(swiper.realIndex)}
          >
            {media.map((item) => (
              <SwiperSlide
                key={item.messageId || item.src}
              >
                {item.type === 'video' ? (
                  <video
                    controls
                    className='img-fluid'
                    onError={() => console.warn('Video failed to load:', item.src)}
                  >
                    <source src={item.src} type={item.fileType || 'video/mp4'} />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <Image
                    src={item.src}
                    className='img-fluid'
                    alt={item.alt}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `${ImagePath}/user/placeholder.png`
                    }}
                  />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        ) : media[0]?.type === 'video' ? (
          <video
            controls
            className='img-fluid'
            onError={() => console.warn('Video failed to load:', media[0]?.src)}
          >
            <source src={media[0]?.src} type={media[0]?.fileType || 'video/mp4'} />
            Your browser does not support the video tag.
          </video>
        ) : (
          <Image
            src={media[0]?.src || `${ImagePath}/user/placeholder.png`}
            alt={media[0]?.alt || 'image'}
            className='img-fluid'
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = `${ImagePath}/user/placeholder.png`
            }}
          />
        )}

        {media.length > 1 && (
          <>
            <button className="custom-swiper-button-prev">
              <RiArrowLeftSLine />
            </button>
            <button className="custom-swiper-button-next">
              <RiArrowRightSLine />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface ImageGalleryProps {
  images: GalleryMedia[]
  initialIndex?: number
  onClose: () => void
  onSlideChange?: (index: number) => void
  className?: string
}

const ImageGallery: FC<ImageGalleryProps> = (props) => {
  return <MediaGallery {...props} media={props.images} />
}

export default ImageGallery
export { MediaGallery }

