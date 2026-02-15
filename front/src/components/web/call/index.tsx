import { useEffect, useState } from 'react'
import { webrtcService } from '../../../services/webrtc.service'
import { useAppSelector } from '../../../store/hooks'
import CallModal from './call-modal'
import CallNotification from './CallNotification'
import { setCurrentCallStatus } from '../../../store/slices/chatSlice'
import { useDispatch } from 'react-redux'

const CallManager = () => {
  const [showCallModal, setShowCallModal] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [isCallMinimized, setIsCallMinimized] = useState(false)
  const { user } = useAppSelector((store) => store.auth)
  const dispatch = useDispatch()

  useEffect(() => {
    const unsubscribe = webrtcService.onStateChange((callState) => {
      if (callState.isInCall || callState.callStatus === 'calling') {
        setShowCallModal(true)

        if (callState.waitingIncoming) {
          setShowNotification(true)
        } else {
          setShowNotification(false)
        }
      } else if (callState.callStatus === 'ringing' && !callState.isInitiator) {
        setShowNotification(true)
        setShowCallModal(false)
      } else {
        setShowCallModal(false)
        setShowNotification(false)
        setIsCallMinimized(false)
      }
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  const handleMinimize = () => {
    setIsCallMinimized(true)
  }

  const handleMaximize = () => {
    setIsCallMinimized(false)
  }

  const handleAcceptCall = async () => {
    if (user) {
      const callState = webrtcService.getCallState()
      const success = await webrtcService.acceptCall(callState.callId!, user)
      if (success) {
        setShowNotification(false)
        setShowCallModal(true)
      }
    }
  }

  const handleDeclineCall = async () => {
    const callState = webrtcService.getCallState()

    // If there's a waiting incoming call, decline it
    if (callState.waitingIncoming) {
      webrtcService.declineWaitingCall()
    } else {
      // Otherwise decline the current ringing call
      await webrtcService.declineCall(callState.callId!)
    }

    setShowNotification(false)
    dispatch(setCurrentCallStatus('idle'))
  }

  const handleEndAndAcceptCall = async () => {
    if (user) {
      const success = await webrtcService.acceptWaitingCall(user)
      if (success) {
        setShowNotification(false)
      }
    }
  }

  const handleCloseModal = () => {
    setShowCallModal(false)
  }

  return (
    <>
      <CallNotification
        isVisible={showNotification}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
        onEndAndAccept={handleEndAndAcceptCall}
      />
      <CallModal
        isOpen={showCallModal}
        onClose={handleCloseModal}
        isMinimized={isCallMinimized}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
      />
    </>
  )
}

export default CallManager
