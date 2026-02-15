import Cookies from 'js-cookie'
import { useEffect } from 'react'
import mutations from '../../../api/mutations'
import queries from '../../../api/queries'
import { STORAGE_KEYS } from '../../../constants'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  logout,
  setImpersonationStatus,
  stopImpersonation as stopImpersonationAction,
} from '../../../store/slices/authSlice'
import { getStorage } from '../../../utils'
import { toaster } from '../../../utils/custom-functions'

const ImpersonationBanner = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((store) => store.auth)
  const { data: statusData } = queries.useGetImpersonationStatus()
  const { mutate: stopImpersonation } = mutations.useStopImpersonation()
  const storage = getStorage()

  useEffect(() => {
    if (statusData) {
      dispatch(
        setImpersonationStatus({
          isImpersonating: statusData.isImpersonating,
          impersonator: statusData.impersonator || null,
        }),
      )
    }
  }, [statusData, dispatch])

  const handleStopImpersonation = () => {
    stopImpersonation(undefined, {
      onSuccess: (data) => {
        const impersonatingLocal = storage.getItem(STORAGE_KEYS.PERSONATING_LOCAL)
        const adminUrl = import.meta.env.VITE_ADMIN_APP_URL

        if (impersonatingLocal == 'true') {
          // Local impersonation (within same app)
          dispatch(stopImpersonationAction({ token: data.token, originalUser: data.originalUser }))
          storage.removeItem(STORAGE_KEYS.PERSONATING_LOCAL)
          window.location.reload()
        } else if (impersonatingLocal == 'false' && adminUrl) {
          // Cross-domain impersonation (redirect back to admin)
          Cookies.remove('impersonate-token')
          storage.removeItem(STORAGE_KEYS.PERSONATING_LOCAL)
          dispatch(logout())
          window.location.href = adminUrl
        } else {
          // Default behavior
          dispatch(stopImpersonationAction({ token: data.token, originalUser: data.originalUser }))
          storage.removeItem(STORAGE_KEYS.PERSONATING_LOCAL)
          window.location.reload()
        }
      },
      onError: (error: any) => {
        toaster('error', error?.message || 'Failed to stop impersonation')
      },
    })
  }

  if (!statusData?.isImpersonating) {
    return null
  }

  return (
    <div
      className="impersonation-banner"
      style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#fff',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        borderBottom: '2px solid #d97706',
        fontSize: '11px',
        lineHeight: '1.3',
        height: '40px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            backgroundColor: 'rgba(255,255,255,0.25)',
            borderRadius: '50%',
            fontSize: '11px',
            flexShrink: 0,
          }}
        >
          🔒
        </span>
        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, fontSize: '11px' }}>Impersonating:</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <strong
            style={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '150px',
            }}
          >
            {user?.name || 'Unknown'}
          </strong>
          <span style={{ opacity: 0.9, fontSize: '10px', whiteSpace: 'nowrap' }}>
            ({user?.email?.split('@')[0] || 'Unknown'})
          </span>
        </span>
      </div>
      <button
        onClick={handleStopImpersonation}
        style={{
          backgroundColor: '#fff',
          color: '#d97706',
          border: 'none',
          padding: '4px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '10px',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          flexShrink: 0,
          marginLeft: '8px',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#fef3c7'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#fff'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        Stop
      </button>
    </div>
  )
}

export default ImpersonationBanner
