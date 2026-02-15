  export interface SettingFormValues {
    logo: string
    logoDark?: string
  }

  export type TeamSettingProps = {
    sectionKey: string
    setActiveSectionSubmitting: (key: string | null) => void
    loading?: boolean
  }
  
  export type SpecifiedMembersModalProps = {
    isOpen: boolean
    toggle: () => void
    onSave: (selectedMemberIds: (string | number)[]) => void
    type?: 'public' | 'private' | null
  }
  