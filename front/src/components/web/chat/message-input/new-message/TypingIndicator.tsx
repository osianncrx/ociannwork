import { useTypingIndicator } from '../../hooks'

const TypingIndicator = () => {
  const { getTypingText } = useTypingIndicator()
  const typingText = getTypingText()
  return typingText ? (
    <div className="typing-indicator">
      <span>{typingText}</span>
      <div className="typing-dots">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
    </div>
  ) : null
}

export default TypingIndicator
