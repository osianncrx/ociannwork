import { useCallback } from 'react'
import { useAppDispatch } from '../../store/hooks'
import { clearTargetMessageId, selectChat, setTargetMessageId } from '../../store/slices/chatSlice'
import { ChatItem } from '../../types'

export const useGlobalRedirect = () => {
  const dispatch = useAppDispatch()

  const redirectToMessage = useCallback((messageId: string, targetChat?: ChatItem) => {
    if (targetChat) {
      dispatch(selectChat(targetChat))
      setTimeout(() => {
        dispatch(setTargetMessageId(messageId))
        setTimeout(() => {
          dispatch(clearTargetMessageId())
        }, 3000)
      }, 500)
    } else {
      dispatch(setTargetMessageId(messageId))
      setTimeout(() => {
        dispatch(clearTargetMessageId())
      }, 3000)
    }
  }, [dispatch])

  return {
    redirectToMessage
  }
}

export default useGlobalRedirect
