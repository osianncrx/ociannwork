import { FC, useEffect, useState } from 'react'
import { queries } from '../../../../../api'
import { messageEncryptionService } from '../../../../../services/message-encryption.service'
import { MessageTypeProps } from '../../../../../types/common'
import Renderer from '../../widgets/Renderer'

const LinkMessage: FC<MessageTypeProps> = (props) => {
  const { message, hideIcon, findMessageById } = props
  const { data: e2eStatus } = queries.useGetE2EStatus()
  const isE2EEnabled = e2eStatus?.e2e_enabled || false
  const { data: senderKeyData } = queries.useGetUserPublicKey(
    message.sender.id,
    { enabled: isE2EEnabled && !!message.sender.id }
  )
  const [decryptedContent, setDecryptedContent] = useState<string>(message.content || '')

  useEffect(() => {
    const decrypt = async () => {
      if (!isE2EEnabled || !message.content) {
        setDecryptedContent(message.content || '')
        return
      }

      try {
        const decrypted = messageEncryptionService.decryptMessage(
          message.content,
          senderKeyData?.public_key || null
        )
        setDecryptedContent(decrypted)
      } catch (error) {
        console.error('Error decrypting link message content:', error)
        setDecryptedContent(message.content || '')
      }
    }

    decrypt()
  }, [message.content, isE2EEnabled, senderKeyData?.public_key])

  return <Renderer value={decryptedContent} message={message} hideIcon={hideIcon} findMessageById={findMessageById} />
}

export default LinkMessage
