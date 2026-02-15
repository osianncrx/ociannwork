import { SvgIcon } from "../../../../shared/icons"

const NoSelectedChat = ()=>{
return(
    <div className="contact-chat-dis">
        <div>
            <SvgIcon iconId="read-messages" className="read-messages-dis" />
        </div>
        <span className="read-messages">
            Select a chat to read messages
        </span>
    </div>
)
}
export default NoSelectedChat