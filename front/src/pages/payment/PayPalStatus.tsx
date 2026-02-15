import { CSSProperties, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardBody, CardTitle, Col, Container, Row, Spinner } from 'reactstrap'
import mutations from '../../api/mutations'
import { ROUTES } from '../../constants'
import { SolidButton } from '../../shared/button'
import { toaster } from '../../utils/custom-functions'

type PayPalStatusProps = {
  type: 'success' | 'cancel'
}

const PayPalStatus = ({ type }: PayPalStatusProps) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { mutateAsync: verifyPayment } = mutations.useVerifyPayment()

  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'cancelled'>(
    type === 'success' ? 'processing' : 'cancelled',
  )
  const [message, setMessage] = useState(
    type === 'success'
      ? 'Processing your PayPal payment...'
      : 'Your PayPal payment was cancelled. No charges were made.',
  )

  const token = searchParams.get('token')
  const payerId = searchParams.get('PayerID')

  const paymentIds = useMemo(() => {
    return {
      paymentId: localStorage.getItem('wallet_paypal_payment_id'),
      orderId: localStorage.getItem('wallet_paypal_order_id'),
    }
  }, [])

  useEffect(() => {
    if (type === 'cancel') {
      localStorage.removeItem('wallet_paypal_payment_id')
      localStorage.removeItem('wallet_paypal_order_id')
      toaster('info', 'PayPal payment was cancelled.')
      return
    }

    const { paymentId, orderId } = paymentIds

    if (!paymentId || !orderId) {
      setStatus('error')
      setMessage('Unable to locate payment session. Please try adding funds again.')
      return
    }

    const verify = async () => {
      try {
        await verifyPayment({
          payment_id: Number(paymentId),
          payment_gateway: 'paypal',
          gateway_payment_id: orderId,
          gateway_response: {
            token,
            payer_id: payerId,
          },
        })

        localStorage.removeItem('wallet_paypal_payment_id')
        localStorage.removeItem('wallet_paypal_order_id')

        setStatus('success')
        setMessage('Wallet funded successfully! Redirecting you back to the wallet page.')
        toaster('success', 'Wallet funded successfully!')

        setTimeout(() => navigate(ROUTES.ADMIN.WALLET, { replace: true }), 2000)
      } catch (error) {
        const err = error as { message?: string }
        setStatus('error')
        setMessage(err?.message || 'Failed to verify PayPal payment. Please contact support.')
      }
    }

    verify()
  }, [type, paymentIds, verifyPayment, navigate, token, payerId])

  const renderStatusIcon = () => {
    const iconStyle: CSSProperties = { fontSize: '3rem' }
    switch (status) {
      case 'success':
        return <div style={iconStyle}>✅</div>
      case 'error':
      case 'cancelled':
        return <div style={iconStyle}>⚠️</div>
      default:
        return <Spinner color="primary" />
    }
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md="6">
          <Card className="text-center shadow-sm">
            <CardBody className="py-5">
              <CardTitle tag="h3" className="mb-4">
                {type === 'success' ? 'Finalizing Payment' : 'Payment Cancelled'}
              </CardTitle>

              <div className="mb-4">{renderStatusIcon()}</div>

              <p className="mb-4">{message}</p>

              {(status === 'error' || status === 'cancelled') && (
                <div className="d-flex justify-content-center gap-2">
                  <SolidButton color="primary" onClick={() => navigate(ROUTES.ADMIN.WALLET)}>
                    Go to Wallet
                  </SolidButton>
                  <SolidButton color="light" onClick={() => navigate(ROUTES.ADMIN.PLANS)}>
                    View Plans
                  </SolidButton>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default PayPalStatus

