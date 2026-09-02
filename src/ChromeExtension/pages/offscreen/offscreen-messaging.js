import { canHandleCommand } from "../../js/modules/messaging.js";

const OFFSCREEN = "offscreen";

const UPDATE_TEAM_SAVED_REPLIES = `UpdateTeamSavedReplies`;

const canHandleUpdateTeamSavedRepliesCommand = (message) =>
    canHandleCommand(message, OFFSCREEN, UPDATE_TEAM_SAVED_REPLIES);

export { canHandleUpdateTeamSavedRepliesCommand }
