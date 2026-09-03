
const handleOpenTeamSavedRepliesPanel = (message, handleMessage) => {
    
    if (!canHandleCommand(message, SERVICE_WORKER, `OpenTeamSavedRepliesPanel`)) {
        return;
    }

    handleMessage(message.windowId);
}
