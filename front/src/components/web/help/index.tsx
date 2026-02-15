import { useState } from 'react'
import FaqsSection from './FaqsSection'
import Header from './Header'
import { TabContent, TabPane } from 'reactstrap'
import { useTableManager } from '../../../utils/hooks'
import { queries } from '../../../api'
import Pages from './Pages'
import Footer from './Footer'
import { HelpTabItem, PageItem } from '../../../types/components/help'
import { SinglePage } from '../../../types/api'

const HelpSection = () => {
  const [activeTab, setActiveTab] = useState('1')
  const { params } = useTableManager()
  const { data, isLoading, isRefetching } = queries.useGetPages(params)
  const baseItem: HelpTabItem[] = [{ id: '1', title: 'FAQs', slug: 'faqs' }]
  const otherArray: PageItem[] =
    data?.data?.pages
      .filter((page: SinglePage) => page.status === 'active')
      .map((item: SinglePage, index: number): PageItem => ({
        id: `${index + baseItem.length + 1}`,
        dataId: item.id,
        title: item.title,
        slug: item.slug,
        content: item.content,
      }))
      .reverse() ?? []

  const tabArray: HelpTabItem[] = [...baseItem, ...otherArray]

  return (
    <div>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} tabArray={tabArray} />
      <div className="main-help">
        <TabContent activeTab={activeTab}>
          <TabPane tabId="1">
            <FaqsSection />
          </TabPane>
          {otherArray.map((item) => (
            <TabPane tabId={item.id} key={item.id}>
              <Pages data={item} isLoading={isLoading} isRefetching={isRefetching} />
            </TabPane>
          ))}
        </TabContent>
      </div>
      <Footer />
    </div>
  )
}

export default HelpSection
