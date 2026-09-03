const closeSavedRepliesPanelMessage = "CloseTeamSavedRepliesPanel";

const handleCloseTeamSavedRepliesPanel = (message, handleMessage) =>{

    if (!canHandleCommand(message, SIDE_PANEL, closeSavedRepliesPanelMessage)) {
        return;
    }

    handleMessage();
}

const closeTeamSavedRepliesPanel = () =>{

    const closeSharedReplilesPanelCommand = 
        createCommand(closeSavedRepliesPanelMessage, SIDE_PANEL, {});
    
    sendNonAsync(closeSharedReplilesPanelCommand);
}
