import { useMemo } from 'react'
import { countryCodes } from '../../data'
import { CountryInfo } from '../../types'

export const useCountry = () => {
  const getCountryNameByCode = (countryCode: string): string => {
    if (!countryCode) return ''
    const country = countryCodes.find((c) => c.code.replace('+', '') === countryCode)
    return country?.name || ''
  }

  const getCountryInfoByCode = (countryCode: string): CountryInfo | null => {
    if (!countryCode) return null
    const country = countryCodes.find((c) => c.code.replace('+', '') === countryCode)
    if (!country) return null

    return {
      name: country.name,
      code: country.code.replace('+', ''),
      flag: country.flag,
      displayCode: country.code,
    }
  }

  const getCountryCodeByName = (countryName: string): string => {
    if (!countryName) return ''
    const country = countryCodes.find((c) => c.name.toLowerCase() === countryName.toLowerCase())
    return country?.code.replace('+', '') || ''
  }

  const getAllCountries = useMemo(() => {
    return countryCodes.map((c) => ({
      name: c.name,
      code: c.code.replace('+', ''),
      flag: c.flag,
      displayCode: c.code,
    }))
  }, [])

  const isValidCountryCode = (countryCode: string): boolean => {
    if (!countryCode) return false
    return countryCodes.some((c) => c.code.replace('+', '') === countryCode)
  }

  return {
    getCountryNameByCode,
    getCountryInfoByCode,
    getCountryCodeByName,
    getAllCountries,
    isValidCountryCode,
  }
}
