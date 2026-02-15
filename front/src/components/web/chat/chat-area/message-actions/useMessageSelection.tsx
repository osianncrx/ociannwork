import { useCallback } from 'react'
import {
  toggleMessageSelection as toggleMessageSelectionAction,
  selectMessage as selectMessageAction,
  enterSelectionMode as enterSelectionModeAction,
  clearSelection as clearSelectionAction,
  exitSelectionMode as exitSelectionModeAction,
  enterEmptySelectionModes as enterEmptySelectionModesAction,
} from '../../../../../store/slices/messageSelectionSlice'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { Message } from '../../../../../types/common'

export const useMessageSelection = () => {
  const dispatch = useAppDispatch()
  const { selectedMessages, isSelectionMode } = useAppSelector((state) => state.messageSelection)

  const toggleMessageSelection = useCallback(
    (messageId: number) => {
      dispatch(toggleMessageSelectionAction(messageId))
    },
    [dispatch],
  )

  const selectMessage = useCallback(
    (messageId: number) => {
      dispatch(selectMessageAction(messageId))
    },
    [dispatch],
  )

  const enterSelectionMode = useCallback(
    (messageId: number) => {
      dispatch(enterSelectionModeAction(messageId))
    },
    [dispatch],
  )

  const clearSelection = useCallback(() => {
    dispatch(clearSelectionAction())
  }, [dispatch])

  const exitSelectionMode = useCallback(() => {
    dispatch(exitSelectionModeAction())
  }, [dispatch])

  const enterEmptySelectionMode = useCallback(() => {
    dispatch(enterEmptySelectionModesAction()) // Fixed: using the action
  }, [dispatch])

  const getSelectedMessagesData = useCallback(
    (allMessages: Message[]) => {
      return allMessages.filter((msg) => selectedMessages.includes(Number(msg.id)))
    },
    [selectedMessages],
  )

  return {
    selectedMessages: new Set(selectedMessages),
    isSelectionMode,
    toggleMessageSelection,
    selectMessage,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    enterEmptySelectionMode,
    getSelectedMessagesData,
  }
}
