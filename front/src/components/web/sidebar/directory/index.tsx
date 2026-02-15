import { useState } from 'react'
import { TabContent, TabPane } from 'reactstrap'
import { useDirectoryData } from '../../../../utils/hooks/useDirectoryData'
import ChannelsTab from './ChannelsTab'
import DirectoryTabs from './DirectoryTabs'
import MembersTab from './MembersChat'
import RecentChatsTab from './RecentChatTabs'

const Directory = () => {
  const [activeTab, setActiveTab] = useState('1')

  const tabItems = [
    { id: '1', label: 'Recent' },
    { id: '2', label: 'Members' },
    { id: '3', label: 'Channels' },
  ]

  const {
    searchTerm,
    setSearchTerm,
    channelSearchTerm,
    setChannelSearchTerm,
    isLoadingMembers,

    // Data
    recentDMs,
    recentChannels,
    filteredMembers,
    filteredChannels,

    // Actions
    handleChatSelect,
  } = useDirectoryData(activeTab)

  const renderTabContent = () => {
    switch (activeTab) {
      case '1':
        return <RecentChatsTab recentDMs={recentDMs} recentChannels={recentChannels} onChatSelect={handleChatSelect} />
      case '2':
        return (
          <MembersTab
            filteredMembers={filteredMembers}
            searchTerm={searchTerm}
            isLoading={isLoadingMembers}
            onSearchChange={setSearchTerm}
            onMemberSelect={handleChatSelect}
            onResetPagination={() => setSearchTerm('')}
          />
        )
      case '3':
        return (
          <ChannelsTab
            filteredChannels={filteredChannels}
            searchTerm={channelSearchTerm}
            onSearchChange={setChannelSearchTerm}
            onChannelSelect={handleChatSelect}
            onResetPagination={() => setChannelSearchTerm('')}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="custom-channel-details custom-scrollbar">
      <DirectoryTabs activeTab={activeTab} onTabChange={setActiveTab} tabItems={tabItems} />
      <TabContent activeTab={activeTab} className='custom-scrollbar'>
        <TabPane tabId="1">{activeTab === '1' && renderTabContent()}</TabPane>
        <TabPane tabId="2">{activeTab === '2' && renderTabContent()}</TabPane>
        <TabPane tabId="3">{activeTab === '3' && renderTabContent()}</TabPane>
      </TabContent>
    </div>
  )
}

export default Directory
