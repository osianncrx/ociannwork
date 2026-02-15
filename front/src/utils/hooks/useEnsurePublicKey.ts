import { useEffect, useRef } from 'react'
import { mutations, queries } from '../../api'
import { generateE2EPublicKey } from '../e2e-utils'
import { messageEncryptionService } from '../../services/message-encryption.service'
import { useAppSelector } from '../../store/hooks'

export const useEnsurePublicKey = () => {
  const { token, user } = useAppSelector((state) => state.auth)
  const { screen } = useAppSelector((state) => state.screen)
  const {
    data: myKeyData,
    isLoading: isLoadingKey,
    isError,
  } = queries.useGetMyPublicKey({
    enabled: !!token && !!user && screen === 'webScreen',
    retry: false,
  })
  const { mutate: savePublicKey } = mutations.useSavePublicKey()
  const hasSavedRef = useRef(false)

  useEffect(() => {
    if (isLoadingKey || !token || !user || isError) return

    if (myKeyData && !myKeyData.public_key && !hasSavedRef.current) {
      const newPublicKey = generateE2EPublicKey()

      savePublicKey(
        { public_key: newPublicKey },
        {
          onSuccess: () => {
            messageEncryptionService.initializeFromPublicKey(newPublicKey)
            hasSavedRef.current = true
          },
        },
      )
    } else if (myKeyData?.public_key) {
      messageEncryptionService.initializeFromPublicKey(myKeyData.public_key)
    }
  }, [myKeyData, isLoadingKey, token, user, isError, savePublicKey])
}
