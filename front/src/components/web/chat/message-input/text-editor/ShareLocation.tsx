import { FC, useState } from 'react'
import { Button, Spinner } from 'reactstrap'
import { SvgIcon } from '../../../../../shared/icons'
import { Hint } from '../../../../../shared/tooltip'
import { ShareLocationProps } from '../../../../../types'

const ShareLocation: FC<ShareLocationProps> = ({ onLocationSelected, disabled = false }) => {
  const [isLoading, setIsLoading] = useState(false)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es compatible con tu navegador')
      return
    }

    setIsLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Try to get address using reverse geocoding
        let address = ''
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'OciannWork Chat Application',
              },
            },
          )
          const data = await response.json()
          if (data.display_name) {
            address = data.display_name
          } else {
            // Fallback to coordinates if no address found
            address = `${latitude}, ${longitude}`
          }
        } catch (error) {
          console.error('Failed to get address:', error)
          // Fallback to coordinates if reverse geocoding fails
          address = `${latitude}, ${longitude}`
        }

        const locationData = {
          latitude,
          longitude,
          address: address || `${latitude}, ${longitude}`,
        }

        onLocationSelected(locationData)
        setIsLoading(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        let errorMessage = 'Error al obtener tu ubicación'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Acceso a ubicación denegado. Habilita los permisos de ubicación.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible.'
            break
          case error.TIMEOUT:
            errorMessage = 'La solicitud de ubicación expiró.'
            break
        }
        alert(errorMessage)
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  return (
    <Hint label="Compartir Ubicación">
      <Button disabled={disabled || isLoading} className='location-btn' size="iconSm" onClick={getCurrentLocation}>
        {isLoading ? (
          <Spinner size="sm" className="location-spinner" />
        ) : (
          <SvgIcon className="editor-svg-hw" iconId="location" />
        )}
      </Button>
    </Hint>
  )
}

export default ShareLocation

