import {canHandleCommand} from "../../js/modules/messaging.js";
import {SERVICE_WORKER} from "../../js/modules/message-receivers.js";

const handleSaveTeamSavedRepliesCommand = async (message, handleMessage) => {

    if (!canHandleCommand(message, SERVICE_WORKER, `SaveTeamSavedReplies`)) {
        return;
    }

    await handleMessage(message.data.name, message.data.replies);
}

const handleOpenTeamSavedRepliesPanel = (message, handleMessage) => {
    
    if (!canHandleCommand(message, SERVICE_WORKER, `OpenTeamSavedRepliesPanel`)) {
        return
    }

    handleMessage(message.windowId);
}

export {handleSaveTeamSavedRepliesCommand, handleOpenTeamSavedRepliesPanel};