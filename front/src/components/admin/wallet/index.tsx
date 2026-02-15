

import { Alert, Col, Container, Row } from 'reactstrap'
import CardWrapper from '../../../shared/card/CardWrapper'
import { useTranslation } from 'react-i18next'

const Wallet = () => {

const { t } = useTranslation()
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper  
            heading={{
              title: 'wallet_overview',
              subtitle: 'wallet_extended_version_required',
            }}
          >
            <Alert color="info" className="mb-0">
              <h5 className="mb-3">
                {t('wallet_extended_version_title', {
                  defaultValue: 'Wallet Feature - Extended Version Required',
                })}
              </h5>
              <p className="mb-2">
                {t('wallet_extended_version_message', {
                  defaultValue:
                    'The Wallet module is available only in the Extended version of the product. To access wallet functionality, please purchase the Extended version.',
                })}
              </p>
              <p className="mb-0">
                <strong>
                  {t('wallet_extended_version_contact', {
                    defaultValue: 'Contact support to upgrade to Extended version.',
                  })}
                </strong>
              </p>
            </Alert>
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default Wallet
