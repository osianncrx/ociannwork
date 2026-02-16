import { SvgIcon } from "../../../../shared/icons"

const NoSelectedChat = ()=>{
return(
    <div className="contact-chat-dis">
        <div>
            <SvgIcon iconId="read-messages" className="read-messages-dis" />
        </div>
        <span className="read-messages">
            Selecciona un chat para leer los mensajes
        </span>
    </div>
)
}
export default NoSelectedChat