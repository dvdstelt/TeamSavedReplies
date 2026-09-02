let replies = [];
let repliesExist = false;
let repliesUI = [];

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

const prepareRepliesUI = async(url) => {

    const replies = await getMatchingSavedReplyConfigsFromLocalStorage(url);

    console.log("replies", replies);

    const repliesExist = arrayIsNotEmpty(replies);

    if (repliesExist) {

        const repliesUi = await createSavedRepliesSidePanelDiv(replies);

        return repliesUi;
    }

    return [];
}

