
const handleSaveTeamSavedRepliesCommand = async (message, handleMessage) => {

    if (!canHandleCommand(message, SERVICE_WORKER, `SaveTeamSavedReplies`)) {
        return;
    }

    await handleMessage(message.data.sourceId, message.data.replies);
}

const handleOpenTeamSavedRepliesPanel = (message, handleMessage) => {
    
    if (!canHandleCommand(message, SERVICE_WORKER, `OpenTeamSavedRepliesPanel`)) {
        return;
    }

    handleMessage(message.windowId);
}
