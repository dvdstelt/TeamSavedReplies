import { canHandleCommand, createCommand, send } from "../../js/modules/messaging.js";

const OFFSCREEN = "offscreen";
const SERVICE_WORKER = "service-worker";

const handleUpdateTeamSavedRepliesCommand = async (message, handleMessage) => {
    if (!canHandleCommand(message, OFFSCREEN, `UpdateTeamSavedReplies`)) {
        return;
    }

    await handleMessage(message.data.name, message.data.url);
}

const sendSaveTeamSavedRepliesCommand = async (name, teamSavedReplies) => {

    const command =
        createCommand(
            `SaveTeamSavedReplies`,
            SERVICE_WORKER,
            {
                name: name,
                replies: teamSavedReplies
            });

    await send(command);
}

export { handleUpdateTeamSavedRepliesCommand, sendSaveTeamSavedRepliesCommand}