import { useState } from 'react'
import { Accordion, AccordionBody, AccordionHeader, AccordionItem } from 'reactstrap'
import { queries } from '../../../api'
import { useTableManager } from '../../../utils/hooks'
import { SvgIcon } from '../../../shared/icons'
import { SingleFAQ } from '../../../types/api'

const FaqsSection = () => {
  const { params } = useTableManager()
  const { data, isLoading, isRefetching } = queries.useGetFaqs(params)
  const [open, setOpen] = useState<string | null>(null)

  const toggle = (id: string) => setOpen(open === id ? null : id)
  const faqs = data?.data?.faqs?.filter((faq: SingleFAQ) => faq.status === 'active') || []

  if (isLoading || isRefetching) {
    return (
      <div className="faq-section d-flex justify-content-center align-items-center">
        <div className="custom-loader-chat">
          <span className="loader-main-chat"></span>
        </div>
      </div>
    )
  }

  if (faqs.length === 0) {
    return (
      <div className="text-muted text-center d-flex no-faq-found">
        <SvgIcon iconId="no-faqs-found" />
        <span>No active FAQs available.</span>
      </div>
    )
  }

  return (
    <div className="faq-section container py-4">
      <Accordion open={open || ''} toggle={toggle}>
        {faqs.map((faq) => {
          const id = faq.id.toString()
          const isActive = open === id

          return (
            <AccordionItem key={id} className={`faq-item ${isActive ? 'active' : ''}`}>
              <AccordionHeader targetId={id}>
                <div className="faq-header-content">
                  <span className="faq-question">{faq.question}</span>
                </div>
              </AccordionHeader>
              <AccordionBody accordionId={id}>
                <p className="faq-answer">{faq.answer}</p>
              </AccordionBody>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

export default FaqsSection
